// GET /entrenamiento: lo que necesitan la ruta por temas y el repaso de hoy. Solo datos del
// estudiante; el catalogo ya esta en memoria en el navegador.

import type { Contexto } from '../contexto.ts';
import { rechazo, responder } from '../http.ts';
import { idDeUsuario } from '../usuarios.ts';

export const entrenamiento = async (ctx: Contexto): Promise<Response> => {
  const { req, sql, cors, identidad } = ctx;
  if (req.method !== 'GET') return responder(rechazo(405, 'metodo', 'Metodo no permitido.'), cors);
  if (!identidad) return responder(rechazo(401, 'sin-sesion', 'Inicia sesion para ver tu entrenamiento.'), cors);

  try {
    const userId = await idDeUsuario(sql, identidad);
    // Toda consulta lleva el usuario como parametro (regla del pooler en paralelo).
    const [resueltos, porTag, [usuario], [propios], [guiada]] = await Promise.all([
      sql`
        SELECT DISTINCT p.problem_number AS numero
        FROM submissions s JOIN problems p ON p.id = s.problem_id
        WHERE s.user_id = ${userId} AND s.verdict = 'ACCEPTED'
      `,
      // Envios reales por etiqueta (no el contador de dominio) y la ultima vez que la practico.
      sql`
        SELECT t.name AS tag, count(*)::int AS intentos,
          count(*) FILTER (WHERE s.verdict = 'ACCEPTED')::int AS aciertos,
          max(s.created_at) AS ultimo
        FROM submissions s
        JOIN problem_tags pt ON pt.problem_id = s.problem_id
        JOIN tags t ON t.id = pt.tag_id
        WHERE s.user_id = ${userId} AND s.verdict NOT IN ('PENDING', 'ERROR_JUEZ')
        GROUP BY t.name
      `,
      sql`SELECT nivel FROM users WHERE id = ${userId}`,
      // Resueltos sin ninguna pista pedida antes del primer aceptado.
      sql`
        SELECT count(*)::int AS n FROM (
          SELECT s.problem_id, min(s.created_at) AS primero
          FROM submissions s
          WHERE s.user_id = ${userId} AND s.verdict = 'ACCEPTED'
          GROUP BY s.problem_id
        ) a
        WHERE NOT EXISTS (
          SELECT 1 FROM pistas h
          WHERE h.user_id = ${userId} AND h.problem_id = a.problem_id AND h.creado_en < a.primero
        )
      `,
      // Modo guiado: basta con que una de sus clases lo tenga activo.
      sql`
        SELECT EXISTS (SELECT 1 FROM clase_miembros m JOIN clases c ON c.id = m.clase_id
          WHERE m.user_id = ${userId} AND c.ruta_guiada) AS activa
      `,
    ]);
    return responder({
      status: 200,
      cuerpo: {
        resueltos: resueltos.map((r) => Number(r.numero)),
        porTag,
        nivel: Number(usuario?.nivel ?? 0),
        resueltosSinPista: propios?.n ?? 0,
        rutaGuiada: guiada?.activa === true,
      },
    }, cors);
  } catch (error) {
    console.error('Entrenamiento error:', (error as Error).message);
    return responder(rechazo(500, 'entrenamiento', 'No se pudo cargar tu entrenamiento.'), cors);
  }
};
