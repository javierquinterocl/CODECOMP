// GET /fundamentos/ejercicios, GET y POST /fundamentos/progreso, POST /fundamentos/borrador
// y POST /fundamentos/envio, que evalua con el juez de PSeInt.

import type { Contexto } from '../contexto.ts';
import { dia, mes } from '../config.ts';
import { rechazo, responder } from '../http.ts';
import { revisarPresupuesto, revisarUsuarioPseint } from '../limites.ts';
import { type Ejemplo, type Invocador, invocadorLambda, juzgar } from '../pseint.ts';
import { idDeUsuario } from '../usuarios.ts';
import { validarBorrador, validarEjercicio } from '../validacion.ts';

// Igual que ESPERA_ENVIO en src/scripts/fundamentosData.js.
const CANDADO_SEGUNDOS = 120;

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
      return responder({ status: 200, cuerpo: { progreso: filas } }, cors);
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

  const userId = await idDeUsuario(sql, identidad);
  // Los ejemplos salen de la base, nunca del navegador; y el candado se mide con su reloj.
  const [ejercicio] = await sql`
    SELECT e.ejemplos, p.abierto_en, now() AS ahora
    FROM fundamentos_ejercicios e
    LEFT JOIN fundamentos_progreso p ON p.ejercicio_id = e.id AND p.user_id = ${userId}
    WHERE e.nivel = ${nivel} AND e.numero = ${numero} AND e.is_active
  `;
  if (!ejercicio) {
    return responder(rechazo(404, 'no-encontrado', 'Ejercicio no encontrado.'), cors);
  }
  const abierto = ejercicio.abierto_en as Date | null;
  const transcurrido = abierto ? (ejercicio.ahora as Date).getTime() - abierto.getTime() : 0;
  if (transcurrido < CANDADO_SEGUNDOS * 1000) {
    return responder(
      rechazo(
        403,
        'candado',
        'Lee el enunciado y piensa tu solucion: el envio todavia no se abre.',
      ),
      cors,
    );
  }

  const hoy = dia(config.zonaHoraria);
  // Si falla la revision del estudiante se deja pasar: el tope global sigue protegiendo.
  let permiso;
  try {
    permiso = await revisarUsuarioPseint(
      sql,
      userId,
      hoy,
      config.pseintEsperaSegundos,
      config.pseintTopeDiario,
    );
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
    return responder(
      rechazo(503, 'presupuesto', 'El juez de PSeInt no esta disponible ahora.'),
      cors,
    );
  }
  if (!presupuesto.permitido) {
    return responder(rechazo(503, presupuesto.codigo!, presupuesto.mensaje!), cors);
  }

  const ejemplos = ejercicio.ejemplos as Ejemplo[];
  try {
    const ejecuciones = await (invocar ?? invocadorLambda(config))(
      codigo,
      ejemplos.map((e) => e.entrada),
    );
    return responder({ status: 200, cuerpo: juzgar(ejemplos, ejecuciones) }, cors);
  } catch (error) {
    console.error('Fallo al invocar el juez de PSeInt:', error);
    // Un envio que no se pudo evaluar no cuenta para el estudiante.
    await sql`
      UPDATE limites_envio
      SET conteo_pseint = GREATEST(conteo_pseint - 1, 0), ultimo_pseint = NULL
      WHERE user_id = ${userId}
    `.catch(() => {});
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
    default:
      return Promise.resolve(responder(rechazo(404, 'ruta', 'Ruta no encontrada.'), ctx.cors));
  }
};
