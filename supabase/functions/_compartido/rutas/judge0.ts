// POST /judge0 - ejecuta contra un caso suelto, con limite y tope de gasto.

import type { Contexto } from '../contexto.ts';
import { rechazo, responder } from '../http.ts';
import { dia, mes } from '../config.ts';
import { hashDe, recortar, validarEnvio } from '../validacion.ts';
import { revisarPresupuesto, revisarUsuario } from '../limites.ts';
import { ejecutar } from '../judge0.ts';
import { idDeUsuario } from '../usuarios.ts';

export const judge0 = async (ctx: Contexto): Promise<Response> => {
  const { req, sql, config, cors, identidad } = ctx;

  if (req.method !== 'POST') {
    return responder(rechazo(405, 'metodo', 'Metodo no permitido.'), cors);
  }
  if (!identidad) {
    return responder(rechazo(401, 'sin-sesion', 'Inicia sesion para enviar codigo.'), cors);
  }

  let cuerpo: unknown = null;
  try {
    cuerpo = await req.json();
  } catch {
    return responder(rechazo(400, 'cuerpo', 'El cuerpo debe ser JSON valido.'), cors);
  }

  const validado = validarEnvio(cuerpo as Record<string, unknown>, config);
  if (!validado.ok) return responder(validado.rechazo, cors);
  const envio = validado.envio;

  const userId = await idDeUsuario(sql, identidad);
  const hoy = dia(config.zonaHoraria);

  // Si falla la revision se deja pasar: el tope global sigue protegiendo.
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

  // Al reves: si falla se corta, un error no puede volverse gasto libre.
  let presupuesto;
  try {
    presupuesto = await revisarPresupuesto(
      sql,
      hoy,
      mes(config.zonaHoraria),
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

  const base = {
    user_id: userId,
    problema_numero: envio.problemaNumero,
    lenguaje_id: envio.languageId,
    codigo_hash: await hashDe(envio.sourceCode),
  };

  const inicio = Date.now();
  let resultado;
  try {
    resultado = await ejecutar(
      {
        source_code: envio.sourceCode,
        language_id: envio.languageId,
        stdin: envio.entrada,
        ...(envio.expectedOutput ? { expected_output: envio.expectedOutput } : {}),
      },
      config,
    );
  } catch (error) {
    const abortado = error instanceof DOMException && error.name === 'AbortError';
    console.error('Error hablando con Judge0:', error);
    await registrar(sql, {
      ...base,
      estado: 'error',
      error_proxy: abortado ? 'timeout' : 'red',
      duracion_ms: Date.now() - inicio,
    });
    return responder(
      rechazo(
        abortado ? 504 : 502,
        abortado ? 'timeout' : 'sin-conexion',
        abortado
          ? 'El juez tardo demasiado en responder. Intentalo de nuevo.'
          : 'No se pudo conectar con el juez.',
      ),
      cors,
    );
  }

  const data = resultado.data as Record<string, never>;
  const estado = resultado.ok ? 'evaluado' : 'error';
  const status = data?.status as { id?: number; description?: string } | undefined;
  const tiempo = data?.time;

  const ejecucionId = await registrar(sql, {
    ...base,
    estado,
    status_id: status?.id ?? null,
    status_descripcion: status?.description ?? null,
    stdout: recortar(data?.stdout),
    stderr: recortar(data?.stderr),
    compile_output: recortar(data?.compile_output),
    tiempo_segundos: tiempo == null || tiempo === '' ? null : Number(tiempo),
    memoria_kb: data?.memory ?? null,
    duracion_ms: Date.now() - inicio,
  });

  return responder({ status: resultado.status, cuerpo: { ...data, envioId: ejecucionId } }, cors);
};

// La bitacora nunca tumba la respuesta.
const registrar = async (
  sql: Contexto['sql'],
  datos: Record<string, unknown>,
): Promise<string | null> => {
  try {
    const [fila] = await sql`INSERT INTO ejecuciones ${sql(datos)} RETURNING id`;
    return fila.id as string;
  } catch (error) {
    console.error('No se pudo guardar la ejecucion:', error);
    return null;
  }
};
