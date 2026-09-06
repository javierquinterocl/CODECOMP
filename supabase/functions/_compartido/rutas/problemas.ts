// GET /problems y /problems/:numero

import type { Contexto } from '../contexto.ts';
import { rechazo, responder } from '../http.ts';

export const listarProblemas = async (ctx: Contexto): Promise<Response> => {
  const { req, url, sql, cors } = ctx;
  if (req.method !== 'GET') {
    return responder(rechazo(405, 'metodo', 'Metodo no permitido.'), cors);
  }

  const limit = Math.min(Math.max(Number(url.searchParams.get('limit')) || 100, 1), 500);
  const offset = Math.max(Number(url.searchParams.get('offset')) || 0, 0);
  const tag = (url.searchParams.get('tag') ?? '').trim();

  try {
    const problemas = await sql`
      SELECT p.id, p.problem_number, p.title, p.slug,
        p.difficulty_rating, p.time_limit_sec, p.memory_limit_mb,
        COALESCE(json_agg(json_build_object('id', t.id, 'name', t.name)
          ORDER BY t.name) FILTER (WHERE t.id IS NOT NULL), '[]') AS tags
      FROM problems p
      LEFT JOIN problem_tags pt ON pt.problem_id = p.id
      LEFT JOIN tags t ON t.id = pt.tag_id
      WHERE p.is_active AND (${tag} = '' OR EXISTS (
        SELECT 1 FROM problem_tags filtro_pt
        JOIN tags filtro_t ON filtro_t.id = filtro_pt.tag_id
        WHERE filtro_pt.problem_id = p.id
          AND regexp_replace(lower(filtro_t.name), '[^a-z0-9]+', '-', 'g') = lower(${tag})
      ))
      GROUP BY p.id
      ORDER BY p.problem_number NULLS LAST, p.id
      LIMIT ${limit} OFFSET ${offset}
    `;
    return responder({ status: 200, cuerpo: { problems: problemas, limit, offset } }, cors);
  } catch (error) {
    console.error('Problems list error:', error);
    return responder(
      rechazo(500, 'consulta', 'No se pudieron consultar los problemas.'),
      cors,
    );
  }
};

export const detalleProblema = async (ctx: Contexto, numero: number): Promise<Response> => {
  const { req, sql, cors } = ctx;
  if (req.method !== 'GET') {
    return responder(rechazo(405, 'metodo', 'Metodo no permitido.'), cors);
  }
  if (!Number.isInteger(numero)) {
    return responder(rechazo(400, 'numero', 'El numero de problema no es valido.'), cors);
  }

  try {
    const [problema] = await sql`
      SELECT p.id, p.problem_number, p.title, p.slug, p.description_markdown,
        p.difficulty_rating, p.time_limit_sec, p.memory_limit_mb,
        COALESCE((SELECT json_agg(json_build_object('input', tc.input, 'output', tc.expected_output)
          ORDER BY tc.id) FROM test_cases tc
          WHERE tc.problem_id = p.id AND NOT tc.is_hidden), '[]') AS examples,
        COALESCE((SELECT json_agg(json_build_object('id', t.id, 'name', t.name)
          ORDER BY t.name) FROM problem_tags pt JOIN tags t ON t.id = pt.tag_id
          WHERE pt.problem_id = p.id), '[]') AS tags
      FROM problems p
      WHERE p.is_active AND p.problem_number = ${numero}
    `;
    if (!problema) {
      return responder(rechazo(404, 'no-encontrado', 'Problema no encontrado.'), cors);
    }
    return responder({ status: 200, cuerpo: { problem: problema } }, cors);
  } catch (error) {
    console.error('Problem detail error:', error);
    return responder(rechazo(500, 'consulta', 'No se pudo consultar el problema.'), cors);
  }
};
