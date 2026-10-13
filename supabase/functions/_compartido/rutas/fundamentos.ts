// GET /fundamentos/ejercicios, GET y POST /fundamentos/progreso, POST /fundamentos/borrador.
// Todavia sin juez: solo se guarda cuando se abrio cada ejercicio y el borrador del editor.

import type { Contexto } from '../contexto.ts';
import { rechazo, responder } from '../http.ts';
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

export const fundamentos = (ctx: Contexto, recurso: string | undefined): Promise<Response> => {
  switch (recurso) {
    case 'ejercicios':
      return listarEjercicios(ctx);
    case 'progreso':
      return progreso(ctx);
    case 'borrador':
      return borrador(ctx);
    default:
      return Promise.resolve(responder(rechazo(404, 'ruta', 'Ruta no encontrada.'), ctx.cors));
  }
};
