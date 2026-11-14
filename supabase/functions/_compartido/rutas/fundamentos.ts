// GET /fundamentos/ejercicios, GET y POST /fundamentos/progreso, POST /fundamentos/borrador,
// POST /fundamentos/envio (juez de PSeInt) y POST /fundamentos/pista (tutor de IA).

import type { Contexto } from '../contexto.ts';
import { type Config, dia, mes } from '../config.ts';
import { rechazo, responder } from '../http.ts';
import { consultar, type Mensaje, recortarA } from '../ia.ts';
import { revisarPista, revisarPresupuesto, revisarUsuarioPseint } from '../limites.ts';
import { SISTEMA_FUNDAMENTOS } from './tutor.ts';
import { notificarSinFallar } from '../notificaciones.ts';
import {
  detalleDe,
  type Ejemplo,
  type Invocador,
  invocadorLambda,
  juzgar,
  paraNavegador,
} from '../pseint.ts';
import { idDeUsuario } from '../usuarios.ts';
import { validarBorrador, validarEjercicio } from '../validacion.ts';

const listarEjercicios = async (ctx: Contexto): Promise<Response> => {
  const { req, sql, cors } = ctx;
  if (req.method !== 'GET') {
    return responder(rechazo(405, 'metodo', 'Metodo no permitido.'), cors);
  }

  try {
    const ejercicios = await sql`
      SELECT nivel, numero, tema, dificultad, titulo, resumen, descripcion, entrada, salida,
        ejemplos, pista_concepto
      FROM fundamentos_ejercicios
      WHERE is_active
      ORDER BY nivel, numero
    `;
    return responder(
      { status: 200, cuerpo: { ejercicios } },
      { ...cors, 'Cache-Control': 'public, max-age=300, s-maxage=3600' },
    );
  } catch (error) {
    console.error('Fundamentos list error:', error);
    return responder(rechazo(500, 'consulta', 'No se pudieron consultar los ejercicios.'), cors);
  }
};

const leerCuerpo = async (req: Request): Promise<Record<string, unknown> | null> => {
  try {
    const cuerpo = await req.json();
    return cuerpo && typeof cuerpo === 'object' ? cuerpo : null;
  } catch {
    return null;
  }
};

const progreso = async (ctx: Contexto): Promise<Response> => {
  const { req, sql, cors, identidad } = ctx;
  if (req.method !== 'GET' && req.method !== 'POST') {
    return responder(rechazo(405, 'metodo', 'Metodo no permitido.'), cors);
  }
  if (!identidad) {
    return responder(rechazo(401, 'sin-sesion', 'Inicia sesion para ver tu avance.'), cors);
  }

  if (req.method === 'GET') {
    try {
      const userId = await idDeUsuario(sql, identidad);
      const filas = await sql`
        SELECT e.nivel, e.numero, p.abierto_en, p.visto_en
        FROM fundamentos_progreso p
        JOIN fundamentos_ejercicios e ON e.id = p.ejercicio_id
        WHERE p.user_id = ${userId} AND e.is_active
        ORDER BY p.visto_en DESC
      `;
      // Resuelto = al menos un envio aceptado (desde la migracion 015 se guardan).
      const resueltos = await sql`
        SELECT DISTINCT e.nivel, e.numero
        FROM fundamentos_envios f JOIN fundamentos_ejercicios e ON e.id = f.ejercicio_id
        WHERE f.user_id = ${userId} AND f.veredicto = 'ACEPTADO' AND e.is_active
      `;
      return responder({ status: 200, cuerpo: { progreso: filas, resueltos } }, cors);
    } catch (error) {
      console.error('Fundamentos progress error:', error);
      return responder(rechazo(500, 'consulta', 'No se pudo consultar tu avance.'), cors);
    }
  }

  const validado = validarEjercicio(await leerCuerpo(req));
  if (!validado.ok) return responder(validado.rechazo, cors);
  const { nivel, numero } = validado.ejercicio;

  try {
    const userId = await idDeUsuario(sql, identidad);
    // La primera apertura fija `abierto_en`; las siguientes solo mueven `visto_en`.
    const [fila] = await sql`
      INSERT INTO fundamentos_progreso (user_id, ejercicio_id)
      SELECT ${userId}::uuid, e.id FROM fundamentos_ejercicios e
      WHERE e.nivel = ${nivel} AND e.numero = ${numero} AND e.is_active
      ON CONFLICT (user_id, ejercicio_id) DO UPDATE SET visto_en = now()
      RETURNING abierto_en, codigo, now() AS ahora
    `;
    if (!fila) {
      return responder(rechazo(404, 'no-encontrado', 'Ejercicio no encontrado.'), cors);
    }
    return responder({ status: 200, cuerpo: fila }, cors);
  } catch (error) {
    console.error('Fundamentos open error:', error);
    return responder(rechazo(500, 'consulta', 'No se pudo registrar la apertura.'), cors);
  }
};

const borrador = async (ctx: Contexto): Promise<Response> => {
  const { req, sql, cors, identidad } = ctx;
  if (req.method !== 'POST') {
    return responder(rechazo(405, 'metodo', 'Metodo no permitido.'), cors);
  }
  if (!identidad) {
    return responder(rechazo(401, 'sin-sesion', 'Inicia sesion para guardar tu codigo.'), cors);
  }

  const validado = validarBorrador(await leerCuerpo(req));
  if (!validado.ok) return responder(validado.rechazo, cors);
  const { nivel, numero, codigo } = validado.borrador;

  try {
    const userId = await idDeUsuario(sql, identidad);
    const guardado = await sql`
      UPDATE fundamentos_progreso AS p SET codigo = ${codigo}
      FROM fundamentos_ejercicios e
      WHERE e.id = p.ejercicio_id AND p.user_id = ${userId}
        AND e.nivel = ${nivel} AND e.numero = ${numero}
    `;
    if (!guardado.count) {
      return responder(rechazo(404, 'no-encontrado', 'Abre el ejercicio antes de guardar.'), cors);
    }
    return responder({ status: 200, cuerpo: { ok: true } }, cors);
  } catch (error) {
    console.error('Fundamentos draft error:', error);
    return responder(rechazo(500, 'consulta', 'No se pudo guardar tu codigo.'), cors);
  }
};

export const envio = async (ctx: Contexto, invocar?: Invocador): Promise<Response> => {
  const { req, sql, config, cors, identidad } = ctx;
  if (req.method !== 'POST') {
    return responder(rechazo(405, 'metodo', 'Metodo no permitido.'), cors);
  }
  if (!identidad) {
    return responder(rechazo(401, 'sin-sesion', 'Inicia sesion para enviar tu solucion.'), cors);
  }

  const validado = validarBorrador(await leerCuerpo(req));
  if (!validado.ok) return responder(validado.rechazo, cors);
  const { nivel, numero, codigo } = validado.borrador;

  if (!invocar && !config.pseintAccessKeyId) {
    console.error('Falta la llave del juez de PSeInt.');
    return responder(rechazo(503, 'sin-juez', 'El juez de PSeInt no esta disponible ahora.'), cors);
  }

  let userId: string;
  let ejercicio;
  try {
    userId = await idDeUsuario(sql, identidad);
    // Los ejemplos y los casos ocultos salen de la base, nunca del navegador.
    [ejercicio] = await sql`
      SELECT e.id, e.ejemplos, e.casos_ocultos, p.abierto_en
      FROM fundamentos_ejercicios e
      LEFT JOIN fundamentos_progreso p ON p.ejercicio_id = e.id AND p.user_id = ${userId}
      WHERE e.nivel = ${nivel} AND e.numero = ${numero} AND e.is_active
    `;
    if (ejercicio && !ejercicio.abierto_en) {
      // Si la apertura no llego a guardarse, se registra ahora (la usan el registro y el docente).
      await sql`
        INSERT INTO fundamentos_progreso (user_id, ejercicio_id)
        SELECT ${userId}::uuid, e.id FROM fundamentos_ejercicios e
        WHERE e.nivel = ${nivel} AND e.numero = ${numero}
        ON CONFLICT (user_id, ejercicio_id) DO NOTHING
      `;
    }
  } catch (error) {
    console.error('Fundamentos submit error:', error);
    return responder(rechazo(500, 'consulta', 'No se pudo preparar tu envio.'), cors);
  }
  if (!ejercicio) {
    return responder(rechazo(404, 'no-encontrado', 'Ejercicio no encontrado.'), cors);
  }
  const hoy = dia(config.zonaHoraria);
  // Si falla la revision del estudiante se deja pasar: el tope global sigue protegiendo.
  let permiso;
  let contado = false;
  try {
    permiso = await revisarUsuarioPseint(
      sql,
      userId,
      hoy,
      config.pseintEsperaSegundos,
      config.pseintTopeDiario,
    );
    contado = permiso.permitido;
  } catch (error) {
    console.error('Fallo al revisar el limite de PSeInt:', error);
    permiso = { permitido: true };
  }
  if (!permiso.permitido) {
    return responder(
      rechazo(429, permiso.codigo!, permiso.mensaje!, { reintentarEn: permiso.esperaSegundos }),
      cors,
    );
  }

  // Un envio que no llego a evaluarse no cuenta para el tope diario; la espera se mantiene.
  const devolverEnvio = async () => {
    if (!contado) return;
    await sql`
      UPDATE limites_envio SET conteo_pseint = GREATEST(conteo_pseint - 1, 0)
      WHERE user_id = ${userId} AND dia_pseint = ${hoy}
    `.catch(() => {});
  };

  // Al reves: si falla el tope global se corta.
  let presupuesto;
  try {
    presupuesto = await revisarPresupuesto(
      sql,
      `pseint:${hoy}`,
      `pseint:${mes(config.zonaHoraria)}`,
      config.pseintMaxDiario,
      config.pseintMaxMensual,
    );
  } catch (error) {
    console.error('Fallo al revisar el presupuesto de PSeInt:', error);
    await devolverEnvio();
    return responder(
      rechazo(503, 'presupuesto', 'El juez de PSeInt no esta disponible ahora.'),
      cors,
    );
  }
  if (!presupuesto.permitido) {
    await devolverEnvio();
    return responder(rechazo(503, presupuesto.codigo!, presupuesto.mensaje!), cors);
  }

  const visibles = ejercicio.ejemplos as Ejemplo[];
  const casos = [...visibles, ...((ejercicio.casos_ocultos ?? []) as Ejemplo[])];
  try {
    const ejecuciones = await (invocar ?? invocadorLambda(config))(
      codigo,
      casos.map((e) => e.entrada),
    );
    const resultado = juzgar(casos, ejecuciones, visibles.length);
    // Si no se puede guardar el envio, el estudiante recibe su veredicto igual (sin pista).
    const fallido = 'ejemplo' in resultado ? resultado.ejemplo : null;
    const [guardado] = await sql`
      INSERT INTO fundamentos_envios
        (user_id, ejercicio_id, codigo, veredicto, ejemplo_fallido, oculto, detalle)
      VALUES (${userId}, ${ejercicio.id}, ${codigo}, ${resultado.veredicto}, ${fallido},
        ${'oculto' in resultado}, ${detalleDe(resultado)})
      RETURNING id
    `.catch((error) => {
      console.error('No se pudo guardar el envio de Fundamentos:', error);
      return [];
    });
    // La clave hace que solo el primer aceptado de cada ejercicio cree el aviso.
    if (resultado.veredicto === 'ACEPTADO') {
      await notificarSinFallar(sql, [{
        userId,
        tipo: 'resuelto',
        clave: `resuelto-f-${nivel}-${numero}`,
        datos: { numero, nivel, modulo: 'fundamentos' },
      }]);
    }
    return responder(
      { status: 200, cuerpo: { ...paraNavegador(resultado), envio_id: guardado?.id ?? null } },
      cors,
    );
  } catch (error) {
    console.error('Fallo al invocar el juez de PSeInt:', error);
    await devolverEnvio();
    return responder(
      rechazo(
        503,
        'juez-no-disponible',
        'El juez de PSeInt no esta disponible ahora. Intentalo en un momento.',
      ),
      cors,
    );
  }
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Veredictos sin nada que orientar: el aceptado y la falla del propio juez.
const SIN_PISTA = new Set(['ACEPTADO', 'FALLO']);
const VIGENCIA_PISTA_MIN = 30;

// Lo que lee la IA. De un caso oculto solo sabe que fallo, nunca sus datos.
export const mensajeDePista = (envio: Record<string, unknown>, config: Config): Mensaje[] => {
  const ejemplos = envio.ejemplos as Ejemplo[];
  const n = envio.ejemplo_fallido as number | null;
  const visible = !envio.oculto && n ? ejemplos[n - 1] : null;
  const caso = envio.oculto
    ? 'FALLO EN UN CASO OCULTO: los ejemplos pasan, uno de los casos que no se muestran no.'
    : visible
    ? `EJEMPLO QUE FALLO: ${n}\nENTRADA:\n${visible.entrada || '(sin entrada)'}`
    : '';
  const enunciado = [
    ...(envio.descripcion as string[]),
    `Entrada: ${envio.entrada}`,
    `Salida: ${envio.salida}`,
  ].join('\n');
  return [
    { role: 'system', content: SISTEMA_FUNDAMENTOS },
    {
      role: 'user',
      content: [
        `EJERCICIO: ${envio.titulo}`,
        `ENUNCIADO:\n${recortarA(enunciado, config.iaMaxEnunciado)}`,
        `VEREDICTO DEL JUEZ: ${envio.veredicto}`,
        caso,
        envio.detalle
          ? `${envio.veredicto === 'ERROR' ? 'ERROR DE PSEINT' : 'SALIDA DEL ESTUDIANTE'}:\n${
            recortarA(envio.detalle as string, config.iaMaxError)
          }`
          : '',
        `CODIGO DEL ESTUDIANTE (PSeInt):\n${recortarA(envio.codigo as string, config.iaMaxCodigo)}`,
      ].filter(Boolean).join('\n\n'),
    },
  ];
};

// POST /fundamentos/pista: retroalimentacion de IA sobre un envio ya evaluado y guardado.
export const pista = async (
  ctx: Contexto,
  preguntar: typeof consultar = consultar,
): Promise<Response> => {
  const { req, sql, config, cors, identidad } = ctx;
  if (req.method !== 'POST') {
    return responder(rechazo(405, 'metodo', 'Metodo no permitido.'), cors);
  }
  if (!identidad) {
    return responder(rechazo(401, 'sin-sesion', 'Inicia sesion para pedir retroalimentacion.'), cors);
  }
  if (!config.iaApiKey) {
    return responder(rechazo(503, 'sin-tutor', 'La retroalimentacion no esta configurada.'), cors);
  }
  const envioId = (await leerCuerpo(req))?.envio_id;
  if (typeof envioId !== 'string' || !UUID.test(envioId)) {
    return responder(rechazo(400, 'datos', 'envio_id es obligatorio.'), cors);
  }

  try {
    const userId = await idDeUsuario(sql, identidad);
    // El codigo y el veredicto salen del envio guardado, no del navegador.
    const [envio] = await sql`
      SELECT f.id, f.ejercicio_id, f.codigo, f.veredicto, f.ejemplo_fallido, f.oculto, f.detalle,
        f.creado_en > now() - make_interval(mins => ${VIGENCIA_PISTA_MIN}) AS vigente,
        e.titulo, e.descripcion, e.entrada, e.salida, e.ejemplos
      FROM fundamentos_envios f JOIN fundamentos_ejercicios e ON e.id = f.ejercicio_id
      WHERE f.id = ${envioId}::uuid AND f.user_id = ${userId}
    `;
    if (!envio) {
      return responder(rechazo(404, 'no-encontrado', 'Ese envio no existe.'), cors);
    }
    if (SIN_PISTA.has(envio.veredicto as string)) {
      return responder(rechazo(400, 'sin-fallo', 'Ese envio no tiene nada que orientar.'), cors);
    }
    if (!envio.vigente) {
      return responder(rechazo(400, 'vencido', 'Envia de nuevo para pedir una pista.'), cors);
    }

    // Si falla la revision del estudiante se deja pasar; si falla el presupuesto se corta.
    let espera;
    try {
      espera = await revisarPista(sql, userId, config.iaEsperaSegundos);
    } catch (error) {
      console.error('Fallo al revisar la espera del tutor:', error);
      espera = { permitido: true };
    }
    if (!espera.permitido) {
      return responder(
        rechazo(429, espera.codigo!, espera.mensaje!, { reintentarEn: espera.esperaSegundos }),
        cors,
      );
    }
    let presupuesto;
    try {
      presupuesto = await revisarPresupuesto(
        sql,
        `ia:${dia(config.zonaHoraria)}`,
        `ia:${mes(config.zonaHoraria)}`,
        config.iaMaxDiario,
        config.iaMaxMensual,
        'tutor',
      );
    } catch (error) {
      console.error('Fallo al revisar el presupuesto del tutor:', error);
      return responder(rechazo(503, 'presupuesto', 'La retroalimentacion no esta disponible.'), cors);
    }
    if (!presupuesto.permitido) {
      return responder(rechazo(503, presupuesto.codigo!, presupuesto.mensaje!), cors);
    }

    const respuesta = await preguntar(mensajeDePista(envio, config), config);
    if (!respuesta.ok) {
      return responder(rechazo(502, 'tutor', respuesta.mensaje!), cors);
    }
    // Si no se puede guardar la pista, el estudiante la recibe igual.
    await sql`
      INSERT INTO fundamentos_pistas (user_id, ejercicio_id, envio_id, veredicto, pista)
      VALUES (${userId}, ${envio.ejercicio_id}, ${envio.id}, ${envio.veredicto}, ${respuesta.texto})
    `.catch((error) => console.error('No se pudo guardar la pista de Fundamentos:', error));
    return responder({ status: 200, cuerpo: { hint: respuesta.texto } }, cors);
  } catch (error) {
    console.error('Fundamentos hint error:', error);
    return responder(rechazo(500, 'tutor', 'No se pudo generar la retroalimentacion.'), cors);
  }
};

export const fundamentos = (ctx: Contexto, recurso: string | undefined): Promise<Response> => {
  switch (recurso) {
    case 'ejercicios':
      return listarEjercicios(ctx);
    case 'progreso':
      return progreso(ctx);
    case 'borrador':
      return borrador(ctx);
    case 'envio':
      return envio(ctx);
    case 'pista':
      return pista(ctx);
    default:
      return Promise.resolve(responder(rechazo(404, 'ruta', 'Ruta no encontrada.'), ctx.cors));
  }
};
