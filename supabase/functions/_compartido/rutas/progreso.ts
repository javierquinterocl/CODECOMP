// GET /recommendations, /progress y POST /sync-user.
// 401 es solo falta de sesion; un fallo de base es 500 (antes todo era 401).

import type { Contexto } from '../contexto.ts';
import { rechazo, responder } from '../http.ts';
import { idDeUsuario } from '../usuarios.ts';

export const recomendaciones = async (ctx: Contexto): Promise<Response> => {
  const { req, url, sql, cors, identidad } = ctx;
  if (req.method !== 'GET') {
    return responder(rechazo(405, 'metodo', 'Metodo no permitido.'), cors);
  }
  if (!identidad) {
    return responder(rechazo(401, 'sin-sesion', 'Inicia sesion para ver tus recomendaciones.'), cors);
  }

  const limite = Math.max(0, Math.min(Number(url.searchParams.get('limit')) || 5, 100));

  try {
    const userId = await idDeUsuario(sql, identidad);
    const problemas = await sql`
      SELECT recomendados.*, problems.problem_number
      FROM get_recommended_problems(${userId}::uuid, ${limite}::int) recomendados
      JOIN problems ON problems.id = recomendados.id
    `;
    return responder({ status: 200, cuerpo: { problems: problemas } }, cors);
  } catch (error) {
    console.error('Recommendations error:', error);
    return responder(
      rechazo(500, 'consulta', 'No se pudieron calcular las recomendaciones.'),
      cors,
    );
  }
};

export const progreso = async (ctx: Contexto): Promise<Response> => {
  const { req, sql, cors, identidad } = ctx;
  if (req.method !== 'GET') {
    return responder(rechazo(405, 'metodo', 'Metodo no permitido.'), cors);
  }
  if (!identidad) {
    return responder(rechazo(401, 'sin-sesion', 'Inicia sesion para ver tu progreso.'), cors);
  }

  try {
    const userId = await idDeUsuario(sql, identidad);
    const [usuario] = await sql`
      SELECT global_rating, solved_count, attempted_count FROM users WHERE id = ${userId}
    `;
    const dominio = await sql`
      SELECT t.name, utm.mastery_score, utm.attempts, utm.successes
      FROM user_tag_mastery utm JOIN tags t ON t.id = utm.tag_id
      WHERE utm.user_id = ${userId}
      ORDER BY utm.mastery_score ASC, t.name
      LIMIT 10
    `;
    return responder({ status: 200, cuerpo: { user: usuario, mastery: dominio } }, cors);
  } catch (error) {
    console.error('Progress error:', error);
    return responder(rechazo(500, 'consulta', 'No se pudo consultar tu progreso.'), cors);
  }
};

export const sincronizarUsuario = async (ctx: Contexto): Promise<Response> => {
  const { req, sql, cors, identidad } = ctx;
  if (req.method !== 'POST') {
    return responder(rechazo(405, 'metodo', 'Metodo no permitido.'), cors);
  }
  if (!identidad) {
    return responder(rechazo(401, 'sin-sesion', 'No autorizado.'), cors);
  }

  try {
    const userId = await idDeUsuario(sql, identidad);
    return responder({ status: 200, cuerpo: { userId } }, cors);
  } catch (error) {
    console.error('User sync error:', error);
    return responder(rechazo(500, 'consulta', 'No se pudo sincronizar el usuario.'), cors);
  }
};
