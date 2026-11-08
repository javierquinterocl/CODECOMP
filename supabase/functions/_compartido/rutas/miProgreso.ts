// GET /mi-progreso: lo que el estudiante necesita para saber que mejorar y que resolver.
// Solo sus propios datos; sin codigo ni comparacion con companeros.

import type { Contexto } from '../contexto.ts';
import { rechazo, responder } from '../http.ts';
import { idDeUsuario } from '../usuarios.ts';
import { escalonDelUsuario } from '../escalon.ts';

export const miProgreso = async (ctx: Contexto): Promise<Response> => {
  const { req, sql, cors, identidad } = ctx;
  if (req.method !== 'GET') return responder(rechazo(405, 'metodo', 'Metodo no permitido.'), cors);
  if (!identidad) {
    return responder(rechazo(401, 'sin-sesion', 'Inicia sesion para ver tu progreso.'), cors);
  }
  try {
    const userId = await idDeUsuario(sql, identidad);
    const [usuario] = await sql`
      SELECT nivel, solved_count AS resueltos, attempted_count AS intentos, datos_autorizados
      FROM users WHERE id = ${userId}
    `;
    const evolucion = await sql`
      SELECT r.cerrado_en, r.nivel_despues, r.cambio, r.aceptado, r.puntaje,
        p.problem_number AS numero, p.title AS titulo, p.title_es AS titulo_es
      FROM resultados_problema r JOIN problems p ON p.id = r.problem_id
      WHERE r.user_id = ${userId} ORDER BY r.cerrado_en
    `;
    const temas = await sql`
      SELECT t.name AS tag, m.attempts AS intentos, m.successes AS aciertos
      FROM user_tag_mastery m JOIN tags t ON t.id = m.tag_id WHERE m.user_id = ${userId}
    `;
    // Intentados y sin aceptar, del mas reciente al mas viejo; los cerrados se marcan.
    const pendientes = await sql`
      SELECT p.problem_number AS numero, p.title AS titulo, p.title_es AS titulo_es,
        p.difficulty_rating AS dificultad, count(*)::int AS intentos, max(s.created_at) AS ultimo,
        EXISTS (SELECT 1 FROM resultados_problema r
          WHERE r.user_id = ${userId} AND r.problem_id = p.id) AS cerrado,
        coalesce((SELECT array_agg(t.name) FROM problem_tags pt JOIN tags t ON t.id = pt.tag_id
          WHERE pt.problem_id = p.id), '{}') AS tags
      FROM submissions s JOIN problems p ON p.id = s.problem_id
      WHERE s.user_id = ${userId} AND s.verdict NOT IN ('PENDING', 'ERROR_JUEZ', 'ACCEPTED')
        AND NOT EXISTS (SELECT 1 FROM submissions a WHERE a.user_id = ${userId}
          AND a.problem_id = p.id AND a.verdict = 'ACCEPTED')
      GROUP BY p.id ORDER BY max(s.created_at) DESC LIMIT 20
    `;
    const actividad = await sql`
      SELECT dia::text, segundos_activos AS segundos
      FROM actividad_diaria WHERE user_id = ${userId} AND dia >= current_date - 13 ORDER BY dia
    `;
    // Fundamentos (PSeInt) cuenta en el avance, no en el nivel: sus ejercicios no tienen rating.
    const fundamentos = await sql`
      SELECT e.nivel, count(*)::int AS total,
        count(*) FILTER (WHERE EXISTS (SELECT 1 FROM fundamentos_envios f
          WHERE f.ejercicio_id = e.id AND f.user_id = ${userId} AND f.veredicto = 'ACEPTADO'))::int AS resueltos
      FROM fundamentos_ejercicios e WHERE e.is_active GROUP BY e.nivel ORDER BY e.nivel
    `;
    const escalon = await escalonDelUsuario(sql, userId);
    return responder({
      status: 200,
      cuerpo: {
        escalon,
        fundamentos,
        usuario: { ...usuario, nivel: Number(usuario.nivel) },
        evolucion,
        temas,
        pendientes,
        actividad,
      },
    }, cors);
  } catch (error) {
    console.error('Mi progreso error:', error);
    return responder(rechazo(500, 'consulta', 'No se pudo consultar tu progreso.'), cors);
  }
};
