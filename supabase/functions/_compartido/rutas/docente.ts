// Vista docente: GET /docente/clase/:id (panel del grupo) y GET /docente/estudiante/:id (ficha).
// Solo docentes, solo sus clases y los estudiantes que estan en ellas. Cada consulta se audita.

import type { Contexto } from '../contexto.ts';
import { esDocente } from '../auth.ts';
import { alertasDe, parecido, UMBRAL_PARECIDO } from '../docente.ts';
import { rechazo, responder } from '../http.ts';
import { idDeUsuario } from '../usuarios.ts';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FALLOS = ['WRONG_ANSWER', 'RUNTIME_ERROR', 'TIME_LIMIT_EXCEEDED'];

const auditar = (
  sql: Contexto['sql'],
  docenteId: string,
  accion: 'ver_clase' | 'ver_estudiante',
  claseId: string | null,
  estudianteId: string | null,
) =>
  sql`
    INSERT INTO auditoria_docente (docente_id, estudiante_id, clase_id, accion)
    VALUES (${docenteId}, ${estudianteId}, ${claseId}, ${accion})
  `;

const panelDeClase = async (ctx: Contexto, docenteId: string, claseId: string) => {
  const { sql, cors } = ctx;
  const [clase] = await sql`
    SELECT id, nombre, codigo FROM clases WHERE id = ${claseId} AND docente_id = ${docenteId}
  `;
  if (!clase) return responder(rechazo(404, 'clase', 'Esa clase no existe o no es tuya.'), cors);
  await auditar(sql, docenteId, 'ver_clase', claseId, null);

  const miembros = () => sql`SELECT user_id FROM clase_miembros WHERE clase_id = ${claseId}`;
  const estudiantes = await sql`
    SELECT u.id, u.firebase_uid, u.username, u.email, u.nivel, u.solved_count, m.unido_en,
      (SELECT count(*)::int FROM submissions s
        WHERE s.user_id = u.id AND s.verdict NOT IN ('PENDING', 'ERROR_JUEZ')) AS envios,
      GREATEST(
        (SELECT max(created_at) FROM submissions WHERE user_id = u.id),
        (SELECT max(actualizado_en) FROM actividad_diaria WHERE user_id = u.id),
        (SELECT max(creado_en) FROM fundamentos_envios WHERE user_id = u.id)
      ) AS ultima_actividad,
      (SELECT coalesce(sum(segundos_activos), 0)::int FROM actividad_diaria a
        WHERE a.user_id = u.id AND a.dia >= current_date - 6) AS segundos_semana,
      (SELECT coalesce(sum(pegados), 0)::int FROM actividad_diaria a
        WHERE a.user_id = u.id AND a.dia >= current_date - 6) AS pegados_semana,
      (SELECT coalesce(max(f), 0)::float FROM (
        SELECT sum(CASE s.verdict WHEN 'TIME_LIMIT_EXCEEDED' THEN 0.5 ELSE 1 END) AS f
        FROM submissions s
        WHERE s.user_id = u.id AND s.created_at > now() - INTERVAL '7 days'
          AND s.verdict::text IN ${sql(FALLOS)}
          AND NOT EXISTS (SELECT 1 FROM submissions a WHERE a.user_id = u.id
            AND a.problem_id = s.problem_id AND a.verdict = 'ACCEPTED')
        GROUP BY s.problem_id) x) AS fallos_sin_aceptar,
      coalesce((SELECT r.nivel_despues FROM resultados_problema r
        WHERE r.user_id = u.id AND r.cerrado_en <= now() - INTERVAL '14 days'
        ORDER BY r.cerrado_en DESC LIMIT 1), 1000) AS nivel_hace_14
    FROM clase_miembros m JOIN users u ON u.id = m.user_id
    WHERE m.clase_id = ${claseId}
    ORDER BY u.nivel DESC
  `;
  const temas = await sql`
    SELECT m.user_id, t.name AS tag, m.attempts AS intentos, m.successes AS aciertos
    FROM user_tag_mastery m JOIN tags t ON t.id = m.tag_id
    WHERE m.user_id IN (${miembros()})
  `;
  const problemas = await sql`
    SELECT p.problem_number AS numero, p.title AS titulo, p.title_es AS titulo_es,
      p.difficulty_rating AS dificultad,
      count(*) FILTER (WHERE s.verdict::text IN ${sql(FALLOS)})::int AS fallos,
      count(DISTINCT s.user_id)::int AS intentaron,
      count(DISTINCT s.user_id) FILTER (WHERE s.verdict = 'ACCEPTED')::int AS resolvieron
    FROM submissions s JOIN problems p ON p.id = s.problem_id
    WHERE s.user_id IN (${miembros()})
    GROUP BY p.id
    HAVING count(*) FILTER (WHERE s.verdict::text IN ${sql(FALLOS)}) > 0
    ORDER BY fallos DESC, intentaron DESC
    LIMIT 10
  `;
  const actividad = await sql`
    SELECT dia::text, sum(segundos_activos)::int AS segundos, count(*)::int AS estudiantes
    FROM actividad_diaria
    WHERE user_id IN (${miembros()}) AND dia >= current_date - 13
    GROUP BY dia ORDER BY dia
  `;

  const ahora = new Date();
  return responder({
    status: 200,
    cuerpo: {
      clase,
      estudiantes: estudiantes.map((e) => ({
        id: e.id,
        firebaseUid: e.firebase_uid,
        username: e.username,
        email: e.email,
        nivel: Number(e.nivel),
        resueltos: e.solved_count,
        envios: e.envios,
        unidoEn: e.unido_en,
        ultimaActividad: e.ultima_actividad,
        segundosSemana: e.segundos_semana,
        pegadosSemana: e.pegados_semana,
        alertas: alertasDe({
          ahora,
          ultimaActividad: e.ultima_actividad as Date | null,
          fallosSinAceptar: Number(e.fallos_sin_aceptar),
          nivelActual: Number(e.nivel),
          nivelHace14Dias: Number(e.nivel_hace_14),
        }),
      })),
      temas,
      problemas,
      actividad,
    },
  }, cors);
};

const fichaDeEstudiante = async (ctx: Contexto, docenteId: string, estudianteId: string) => {
  const { sql, cors } = ctx;
  const [clase] = await sql`
    SELECT c.id, c.nombre FROM clase_miembros m JOIN clases c ON c.id = m.clase_id
    WHERE m.user_id = ${estudianteId} AND c.docente_id = ${docenteId}
    ORDER BY m.unido_en LIMIT 1
  `;
  if (!clase) {
    return responder(rechazo(404, 'estudiante', 'Ese estudiante no esta en tus clases.'), cors);
  }
  await auditar(sql, docenteId, 'ver_estudiante', clase.id as string, estudianteId);

  const [usuario] = await sql`
    SELECT id, firebase_uid, username, email, nivel, solved_count, attempted_count, created_at,
      datos_autorizados
    FROM users WHERE id = ${estudianteId}
  `;
  const evolucion = await sql`
    SELECT r.cerrado_en, r.nivel_despues, r.cambio, r.aceptado, r.puntaje,
      p.problem_number AS numero, p.title AS titulo
    FROM resultados_problema r JOIN problems p ON p.id = r.problem_id
    WHERE r.user_id = ${estudianteId} ORDER BY r.cerrado_en
  `;
  const envios = await sql`
    SELECT s.id, s.created_at, s.verdict, s.language_id, s.caso_fallido, s.rating_change,
      s.source_code, p.problem_number AS numero, p.title AS titulo
    FROM submissions s JOIN problems p ON p.id = s.problem_id
    WHERE s.user_id = ${estudianteId} ORDER BY s.created_at DESC LIMIT 50
  `;
  const pistas = await sql`
    SELECT x.creado_en, x.veredicto, x.pista, p.problem_number AS numero, p.title AS titulo
    FROM pistas x JOIN problems p ON p.id = x.problem_id
    WHERE x.user_id = ${estudianteId} ORDER BY x.creado_en DESC LIMIT 30
  `;
  const actividad = await sql`
    SELECT dia::text, segundos_activos AS segundos, pegados, caracteres_pegados
    FROM actividad_diaria WHERE user_id = ${estudianteId} AND dia >= current_date - 29
    ORDER BY dia
  `;
  const fundamentos = await sql`
    SELECT f.creado_en, f.veredicto, f.ejemplo_fallido, f.codigo, e.nivel, e.numero, e.titulo
    FROM fundamentos_envios f JOIN fundamentos_ejercicios e ON e.id = f.ejercicio_id
    WHERE f.user_id = ${estudianteId} ORDER BY f.creado_en DESC LIMIT 30
  `;
  const temas = await sql`
    SELECT t.name AS tag, m.attempts AS intentos, m.successes AS aciertos
    FROM user_tag_mastery m JOIN tags t ON t.id = m.tag_id WHERE m.user_id = ${estudianteId}
  `;

  // Indicio para el docente, nunca sancion: aceptados muy parecidos a los de un companero.
  const aceptados = await sql`
    SELECT DISTINCT ON (s.problem_id, s.user_id) s.problem_id, s.user_id, s.source_code,
      u.username, p.problem_number AS numero, p.title AS titulo
    FROM submissions s JOIN users u ON u.id = s.user_id JOIN problems p ON p.id = s.problem_id
    WHERE s.verdict = 'ACCEPTED'
      AND s.problem_id IN (SELECT problem_id FROM submissions
        WHERE user_id = ${estudianteId} AND verdict = 'ACCEPTED')
      AND s.user_id IN (SELECT m.user_id FROM clase_miembros m JOIN clases c ON c.id = m.clase_id
        WHERE c.docente_id = ${docenteId})
    ORDER BY s.problem_id, s.user_id, s.created_at
  `;
  const parecidos = [];
  for (const propio of aceptados.filter((a) => a.user_id === estudianteId)) {
    for (const otro of aceptados) {
      if (otro.problem_id !== propio.problem_id || otro.user_id === estudianteId) continue;
      const valor = parecido(propio.source_code as string, otro.source_code as string);
      if (valor >= UMBRAL_PARECIDO) {
        parecidos.push({
          numero: propio.numero,
          titulo: propio.titulo,
          companero: otro.username,
          parecido: Math.round(valor * 100) / 100,
        });
      }
    }
  }

  return responder({
    status: 200,
    cuerpo: { clase, usuario, evolucion, envios, pistas, actividad, fundamentos, temas, parecidos },
  }, cors);
};

export const docente = async (
  ctx: Contexto,
  recurso: string | undefined,
  id: string | undefined,
): Promise<Response> => {
  const { req, sql, config, cors, identidad } = ctx;
  if (req.method !== 'GET') return responder(rechazo(405, 'metodo', 'Metodo no permitido.'), cors);
  if (!identidad) {
    return responder(rechazo(401, 'sin-sesion', 'Inicia sesion para continuar.'), cors);
  }
  if (!esDocente(identidad, config.docentes)) {
    return responder(rechazo(403, 'rol', 'Esta vista es solo para docentes.'), cors);
  }
  if (!id || !UUID.test(id) || (recurso !== 'clase' && recurso !== 'estudiante')) {
    return responder(rechazo(404, 'ruta', 'Ruta no encontrada.'), cors);
  }
  try {
    const docenteId = await idDeUsuario(sql, identidad);
    return recurso === 'clase'
      ? await panelDeClase(ctx, docenteId, id)
      : await fichaDeEstudiante(ctx, docenteId, id);
  } catch (error) {
    console.error('Docente error:', error);
    return responder(rechazo(500, 'docente', 'No se pudo cargar la vista docente.'), cors);
  }
};
