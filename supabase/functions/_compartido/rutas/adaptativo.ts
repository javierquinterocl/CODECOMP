// POST /adaptive - evalua todos los casos y actualiza rating.
// El endpoint mas caro: N llamadas al juez por envio, por eso cobra
// presupuesto por caso. Secuencial con corte al primer fallo a proposito:
// gasta menos cuota que en paralelo, y aqui esperar no cuesta (se factura CPU).

import type { Contexto } from '../contexto.ts';
import { rechazo, responder } from '../http.ts';
import { dia, mes } from '../config.ts';
import { revisarPresupuesto, revisarUsuario } from '../limites.ts';
import { ejecutar, veredictoDe } from '../judge0.ts';
import { procesarResultado } from '../skillEngine.ts';
import { idDeUsuario } from '../usuarios.ts';

export const adaptativo = async (ctx: Contexto): Promise<Response> => {
  const { req, sql, config, cors, identidad } = ctx;

  if (req.method !== 'POST') {
    return responder(rechazo(405, 'metodo', 'Metodo no permitido.'), cors);
  }
  if (!identidad) {
    return responder(rechazo(401, 'sin-sesion', 'Inicia sesion para enviar codigo.'), cors);
  }

  let cuerpo: Record<string, unknown>;
  try {
    cuerpo = (await req.json()) ?? {};
  } catch {
    return responder(rechazo(400, 'cuerpo', 'El cuerpo debe ser JSON valido.'), cors);
  }

  const problemaNumero = cuerpo.problem_number;
  const sourceCode = cuerpo.source_code;
  const languageId = cuerpo.language_id;

  if (
    !Number.isInteger(problemaNumero) ||
    typeof sourceCode !== 'string' ||
    !sourceCode.trim() ||
    !Number.isInteger(languageId) ||
    !config.lenguajesPermitidos.has(languageId as number)
  ) {
    return responder(
      rechazo(400, 'datos', 'problem_number, source_code y language_id son obligatorios.'),
      cors,
    );
  }

  const hoy = dia(config.zonaHoraria);
  const esteMes = mes(config.zonaHoraria);

  try {
    const userId = await idDeUsuario(sql, identidad);

    let permiso;
    try {
      permiso = await revisarUsuario(sql, userId, hoy);
    } catch (error) {
      console.error('Fallo al revisar el limite del usuario:', error);
      permiso = { permitido: true };
    }
    if (!permiso.permitido) {
      return responder(
        rechazo(429, permiso.codigo!, permiso.mensaje!, { reintentarEn: permiso.esperaSegundos }),
        cors,
      );
    }

    // Preparacion en una transaccion: problema, casos y fila del envio.
    const preparado = await sql.begin(async (tx) => {
      const [problema] = await tx`
        SELECT id FROM problems WHERE problem_number = ${problemaNumero as number} AND is_active
      `;
      if (!problema) return { error: 'no-importado' as const };

      const casos = await tx`
        SELECT input, expected_output FROM test_cases
        WHERE problem_id = ${problema.id} ORDER BY id
        LIMIT ${config.maxCasosPorEnvio}
      `;
      if (!casos.length) return { error: 'sin-casos' as const };

      const [envio] = await tx`
        INSERT INTO submissions (user_id, problem_id, source_code, language_id)
        VALUES (${userId}, ${problema.id}, ${sourceCode}, ${languageId as number})
        RETURNING id
      `;
      return { submissionId: envio.id as string, casos };
    });

    if ('error' in preparado) {
      return preparado.error === 'no-importado'
        ? responder(rechazo(404, 'no-importado', 'Este problema todavia no esta disponible.'), cors)
        : responder(rechazo(409, 'sin-casos', 'El problema no tiene casos de prueba.'), cors);
    }

    const { submissionId, casos } = preparado;
    const limite = Date.now() + config.deadlineMs;
    let ultimo: Record<string, unknown> | null = null;
    let veredicto = 'RUNTIME_ERROR';

    for (const caso of casos) {
      if (Date.now() > limite) {
        return responder(
          rechazo(504, 'timeout', 'La evaluacion tardo demasiado. Intentalo de nuevo.'),
          cors,
        );
      }

      // Un caso = una llamada al juez = una unidad de presupuesto.
      let presupuesto;
      try {
        presupuesto = await revisarPresupuesto(
          sql,
          hoy,
          esteMes,
          config.maxDiario,
          config.maxMensual,
        );
      } catch (error) {
        console.error('Fallo al revisar el presupuesto:', error);
        return responder(
          rechazo(503, 'presupuesto', 'El juez no esta disponible en este momento.'),
          cors,
        );
      }
      if (!presupuesto.permitido) {
        return responder(rechazo(503, presupuesto.codigo!, presupuesto.mensaje!), cors);
      }

      const resultado = await ejecutar(
        {
          source_code: sourceCode,
          language_id: languageId as number,
          stdin: (caso.input as string) ?? '',
          expected_output: caso.expected_output as string,
        },
        config,
      );

      const status = resultado.data?.status as { id?: number } | undefined;
      veredicto = veredictoDe(status?.id);
      ultimo = resultado.data;
      if (veredicto !== 'ACCEPTED') break;
    }

    const procesado = await procesarResultado(sql, submissionId, veredicto);

    return responder(
      {
        status: 200,
        cuerpo: {
          ...ultimo,
          submissionId: procesado.submission_id,
          verdict: procesado.verdict,
          ratingChange: procesado.rating_change,
          firstSolve: procesado.first_solve,
        },
      },
      cors,
    );
  } catch (error) {
    console.error('Adaptive submission error:', error);
    return responder(rechazo(500, 'envio', 'No se pudo procesar el envio.'), cors);
  }
};
