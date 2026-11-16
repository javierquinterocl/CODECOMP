// Vista docente: GET /docente/clase/:id (panel del grupo), GET /docente/estudiante/:id (ficha),
// POST /docente/clase/:id/aviso (aviso a la clase) y POST /docente/estudiante/:id/escalon.
// Solo docentes, solo sus clases y los estudiantes que estan en ellas. Cada consulta se audita.

import type { Contexto } from '../contexto.ts';
import { esDocente } from '../auth.ts';
import {
  alertasDe,
  ETIQUETAS_GENERICAS,
  motivosDePegado,
  parecido,
  PEGADO_DIAS,
  PEGADO_MIN_CARACTERES,
  TEMA_ENVIOS,
  TEMA_PROBLEMAS,
  TEMA_TASA,
  UMBRAL_PARECIDO,
} from '../docente.ts';
import { rechazo, responder } from '../http.ts';
import { idDeUsuario } from '../usuarios.ts';
import { escalonDelUsuario } from '../escalon.ts';
import { dia } from '../config.ts';
import {
  detalleDeDia,
  fechaValida,
  fundamentosResueltos,
  mapaDeActividad,
  tiempoPorEjercicio,
} from '../actividad.ts';
import { huellaCorta, notificar, notificarSinFallar } from '../notificaciones.ts';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FALLOS = ['WRONG_ANSWER', 'RUNTIME_ERROR', 'TIME_LIMIT_EXCEEDED'];

const auditar = (
  sql: Contexto['sql'],
  docenteId: string,
  accion: 'ver_clase' | 'ver_estudiante' | 'cambiar_escalon' | 'avisar_clase' | 'ruta_guiada',
  claseId: string | null,
  estudianteId: string | null,
) =>
  sql`
    INSERT INTO auditoria_docente (docente_id, estudiante_id, clase_id, accion)
    VALUES (${docenteId}, ${estudianteId}, ${claseId}, ${accion})
  `;

/**
 * Primeros aceptados de los ultimos 14 dias con un pegado grande en ese problema, ya filtrados por
 * `motivosDePegado`. Sin autorizacion de datos no hay filas de actividad y no sale nada.
 */
export const aceptadosConPegado = async (sql: Contexto['sql'], userIds: string[], zona: string) => {
  if (!userIds.length) return [];
  const filas = await sql`
    WITH primeros AS (
      SELECT DISTINCT ON (s.user_id, s.problem_id) s.user_id, s.problem_id, s.created_at,
        length(s.source_code) AS largo
      FROM submissions s
      WHERE s.user_id = ANY(${userIds}::uuid[]) AND s.verdict = 'ACCEPTED'
      ORDER BY s.user_id, s.problem_id, s.created_at
    )
    SELECT pr.user_id, pr.created_at AS aceptado_en, pr.largo, u.nivel,
      p.problem_number AS numero, p.title AS titulo, p.difficulty_rating AS rating,
      a.caracteres, a.segundos,
      NOT EXISTS (SELECT 1 FROM submissions o WHERE o.user_id = pr.user_id
        AND o.problem_id = pr.problem_id AND o.created_at < pr.created_at
        AND o.verdict NOT IN ('PENDING', 'ERROR_JUEZ')) AS primer_intento
    FROM primeros pr
    JOIN problems p ON p.id = pr.problem_id
    JOIN users u ON u.id = pr.user_id
    JOIN LATERAL (
      SELECT sum(ae.caracteres_pegados)::int AS caracteres, sum(ae.segundos)::int AS segundos
      FROM actividad_ejercicio ae
      WHERE ae.user_id = pr.user_id AND ae.problem_id = pr.problem_id
        AND ae.dia <= (pr.created_at AT TIME ZONE ${zona})::date
    ) a ON a.caracteres >= ${PEGADO_MIN_CARACTERES}
    WHERE pr.created_at > now() - make_interval(days => ${PEGADO_DIAS})
    ORDER BY pr.created_at DESC
  `;
  return filas
    .map((f) => ({
      userId: f.user_id as string,
      numero: f.numero as number,
      titulo: f.titulo as string,
      aceptadoEn: f.aceptado_en as Date,
      caracteresPegados: Number(f.caracteres),
      largoCodigo: Number(f.largo),
      motivos: motivosDePegado({
        caracteresPegados: Number(f.caracteres),
        largoCodigo: Number(f.largo),
        primerIntento: f.primer_intento === true,
        rating: Number(f.rating),
        nivel: Number(f.nivel),
        segundosActivos: f.segundos === null ? null : Number(f.segundos),
      }),
    }))
    .filter((f) => f.motivos.length);
};

type Origen = { claseId: string } | { userId: string };

/** Estudiantes de una clase con sus datos y alertas; lo usan el panel y las notificaciones. */
export const estudiantesDeClase = (sql: Contexto['sql'], claseId: string, zona: string) =>
  estudiantesDe(sql, { claseId }, zona);

/** Las mismas alertas para un estudiante, con o sin clase (Mi progreso). */
export const alertasPropias = async (sql: Contexto['sql'], userId: string, zona: string) =>
  (await estudiantesDe(sql, { userId }, zona))[0]?.alertas ?? [];

const estudiantesDe = async (sql: Contexto['sql'], origen: Origen, zona: string) => {
  // Sin clase, el recorrido se cuenta desde el registro (m.unido_en = fecha de la cuenta).
  const de = 'claseId' in origen
    ? sql`FROM clase_miembros m JOIN users u ON u.id = m.user_id WHERE m.clase_id = ${origen.claseId}`
    : sql`FROM users u CROSS JOIN LATERAL (SELECT u.created_at AS unido_en) m WHERE u.id = ${origen.userId}`;
  const estudiantes = await sql`
    SELECT u.id, u.firebase_uid, u.username, u.email, u.nivel, u.solved_count, m.unido_en,
      (SELECT count(*)::int FROM submissions s
        WHERE s.user_id = u.id AND s.verdict NOT IN ('PENDING', 'ERROR_JUEZ')) AS envios,
      (SELECT count(DISTINCT f.ejercicio_id)::int FROM fundamentos_envios f
        WHERE f.user_id = u.id AND f.veredicto = 'ACEPTADO') AS fundamentos_resueltos,
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
      -- Sin historial de hace 14 o 21 dias no hay base: NULL, no el 1000 inicial (evita falsas alertas).
      (SELECT r.nivel_despues FROM resultados_problema r
        WHERE r.user_id = u.id AND r.cerrado_en <= now() - INTERVAL '14 days'
        ORDER BY r.cerrado_en DESC LIMIT 1) AS nivel_hace_14,
      -- Estancamiento: meseta de 3 semanas, tema donde no avanza, dependencia de pistas y Fundamentos.
      (SELECT count(*)::int FROM submissions s WHERE s.user_id = u.id
        AND s.created_at > now() - INTERVAL '21 days' AND s.verdict NOT IN ('PENDING', 'ERROR_JUEZ')) AS envios_21,
      coalesce((SELECT min(s.created_at) FROM submissions s WHERE s.user_id = u.id) <= now() - INTERVAL '21 days', false) AS practica_desde_antes,
      (SELECT r.nivel_despues FROM resultados_problema r
        WHERE r.user_id = u.id AND r.cerrado_en <= now() - INTERVAL '21 days'
        ORDER BY r.cerrado_en DESC LIMIT 1) AS nivel_hace_21,
      (SELECT t.name FROM submissions s
        JOIN problem_tags pt ON pt.problem_id = s.problem_id JOIN tags t ON t.id = pt.tag_id
        WHERE s.user_id = u.id AND s.created_at > now() - INTERVAL '14 days'
          AND s.verdict NOT IN ('PENDING', 'ERROR_JUEZ') AND t.name <> ALL(${ETIQUETAS_GENERICAS}::text[])
        GROUP BY t.name
        HAVING count(DISTINCT s.problem_id) >= ${TEMA_PROBLEMAS} AND count(*) >= ${TEMA_ENVIOS}
          AND avg(CASE WHEN s.verdict = 'ACCEPTED' THEN 1 ELSE 0 END) < ${TEMA_TASA}
        ORDER BY avg(CASE WHEN s.verdict = 'ACCEPTED' THEN 1 ELSE 0 END), count(*) DESC LIMIT 1) AS tema_atascado,
      (SELECT count(*)::int FROM (
        SELECT s.problem_id FROM submissions s WHERE s.user_id = u.id AND s.verdict = 'ACCEPTED'
        GROUP BY s.problem_id HAVING min(s.created_at) > now() - INTERVAL '30 days') x) AS resueltos_30,
      (SELECT count(*)::int FROM (
        SELECT s.problem_id, min(s.created_at) AS primero FROM submissions s
        WHERE s.user_id = u.id AND s.verdict = 'ACCEPTED'
        GROUP BY s.problem_id HAVING min(s.created_at) > now() - INTERVAL '30 days') x
        WHERE EXISTS (SELECT 1 FROM pistas h WHERE h.user_id = u.id AND h.problem_id = x.problem_id
          AND h.nivel >= 2 AND h.creado_en < x.primero)) AS con_ayuda_30,
      (SELECT coalesce(max(c), 0)::int FROM (
        SELECT count(*) AS c FROM fundamentos_envios f
        WHERE f.user_id = u.id AND f.creado_en > now() - INTERVAL '7 days'
          AND f.veredicto NOT IN ('ACEPTADO', 'FALLO')
          AND NOT EXISTS (SELECT 1 FROM fundamentos_envios a WHERE a.user_id = u.id
            AND a.ejercicio_id = f.ejercicio_id AND a.veredicto = 'ACEPTADO')
        GROUP BY f.ejercicio_id) x) AS fallos_fundamentos
    ${de}
    ORDER BY u.nivel DESC
  `;
  // El pegado es solo para el docente: en las alertas propias no se calcula.
  const pegados = 'claseId' in origen
    ? await aceptadosConPegado(sql, estudiantes.map((e) => e.id as string), zona)
    : [];
  const ahora = new Date();
  return estudiantes.map((e) => ({
    conPegado: pegados.filter((p) => p.userId === e.id),
    id: e.id as string,
    firebaseUid: e.firebase_uid,
    username: e.username,
    email: e.email,
    nivel: Number(e.nivel),
    resueltos: e.solved_count,
    fundamentosResueltos: e.fundamentos_resueltos,
    envios: e.envios,
    unidoEn: e.unido_en as Date,
    ultimaActividad: e.ultima_actividad,
    segundosSemana: e.segundos_semana,
    pegadosSemana: e.pegados_semana,
    alertas: alertasDe({
      ahora,
      ultimaActividad: e.ultima_actividad as Date | null,
      fallosSinAceptar: Number(e.fallos_sin_aceptar),
      nivelActual: Number(e.nivel),
      nivelHace14Dias: e.nivel_hace_14 === null ? null : Number(e.nivel_hace_14),
      diasEnClase: (ahora.getTime() - new Date(e.unido_en as Date).getTime()) / 86_400_000,
      enviosMeseta: Number(e.envios_21),
      practicaDesdeAntes: e.practica_desde_antes === true,
      nivelHaceMeseta: e.nivel_hace_21 === null ? undefined : Number(e.nivel_hace_21),
      temaAtascado: (e.tema_atascado as string | null) ?? null,
      resueltos30: Number(e.resueltos_30),
      conAyuda30: Number(e.con_ayuda_30),
      fallosFundamentos: Number(e.fallos_fundamentos),
      resueltosConPegado: pegados.filter((p) => p.userId === e.id).length,
    }),
  }));
};

const panelDeClase = async (ctx: Contexto, docenteId: string, claseId: string) => {
  const { sql, cors } = ctx;
  const [clase] = await sql`
    SELECT id, nombre, codigo, ruta_guiada FROM clases WHERE id = ${claseId} AND docente_id = ${docenteId}
  `;
  if (!clase) return responder(rechazo(404, 'clase', 'Esa clase no existe o no es tuya.'), cors);
  await auditar(sql, docenteId, 'ver_clase', claseId, null);

  const miembros = () => sql`SELECT user_id FROM clase_miembros WHERE clase_id = ${claseId}`;
  const estudiantes = await estudiantesDeClase(sql, claseId, ctx.config.zonaHoraria);
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

  return responder({
    status: 200,
    cuerpo: {
      clase,
      estudiantes,
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
      datos_autorizados,
      (SELECT extract(epoch FROM actualizada_en) * 1000 FROM foto_usuario WHERE user_id = users.id)::bigint AS foto_version
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
    SELECT x.creado_en, x.veredicto, x.pista, x.nivel, p.problem_number AS numero, p.title AS titulo
    FROM pistas x JOIN problems p ON p.id = x.problem_id
    WHERE x.user_id = ${estudianteId} ORDER BY x.creado_en DESC LIMIT 30
  `;
  const actividad = await sql`
    SELECT dia::text, segundos_activos AS segundos, pegados, caracteres_pegados
    FROM actividad_diaria WHERE user_id = ${estudianteId} AND dia >= current_date - 29
    ORDER BY dia
  `;
  const fundamentos = await sql`
    SELECT f.creado_en, f.veredicto, f.ejemplo_fallido, f.oculto, f.codigo, e.nivel, e.numero,
      e.titulo
    FROM fundamentos_envios f JOIN fundamentos_ejercicios e ON e.id = f.ejercicio_id
    WHERE f.user_id = ${estudianteId} ORDER BY f.creado_en DESC LIMIT 30
  `;
  const pistasFundamentos = await sql`
    SELECT x.creado_en, x.veredicto, x.pista, e.nivel, e.numero, e.titulo
    FROM fundamentos_pistas x JOIN fundamentos_ejercicios e ON e.id = x.ejercicio_id
    WHERE x.user_id = ${estudianteId} ORDER BY x.creado_en DESC LIMIT 30
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

  const [escalon, mapa, ejercicios, fundamentosHechos] = await Promise.all([
    escalonDelUsuario(sql, estudianteId),
    mapaDeActividad(sql, estudianteId, ctx.config.zonaHoraria, dia(ctx.config.zonaHoraria)),
    tiempoPorEjercicio(sql, estudianteId),
    fundamentosResueltos(sql, estudianteId),
  ]);
  // Las mismas alertas que el panel de la clase (incluido el estancamiento y el pegado).
  const propio = (await estudiantesDeClase(sql, clase.id as string, ctx.config.zonaHoraria))
    .find((e) => e.id === estudianteId);
  const alertas = propio?.alertas ?? [];
  const conPegado = (propio?.conPegado ?? []).map(({ userId: _u, ...resto }) => resto);
  return responder({
    status: 200,
    cuerpo: {
      clase,
      usuario: { ...usuario, fundamentos_resueltos: fundamentosHechos },
      escalon,
      alertas,
      conPegado,
      evolucion,
      envios,
      pistas,
      pistas_fundamentos: pistasFundamentos,
      actividad,
      mapa,
      ejercicios,
      fundamentos,
      temas,
      parecidos,
    },
  }, cors);
};

// POST /docente/estudiante/:id/escalon { minimo }: el docente sube (o devuelve) el piso del escalon.
/** Detalle de un dia de un estudiante de sus clases; se audita como ver_estudiante. */
const diaDeEstudiante = async (ctx: Contexto, docenteId: string, estudianteId: string) => {
  const { url, sql, config, cors } = ctx;
  const fecha = url.searchParams.get('fecha');
  if (!fechaValida(fecha, dia(config.zonaHoraria))) {
    return responder(rechazo(400, 'fecha', 'Elige un dia de los ultimos 12 meses.'), cors);
  }
  const [clase] = await sql`
    SELECT c.id FROM clase_miembros m JOIN clases c ON c.id = m.clase_id
    WHERE m.user_id = ${estudianteId} AND c.docente_id = ${docenteId}
    ORDER BY m.unido_en LIMIT 1
  `;
  if (!clase) {
    return responder(rechazo(404, 'estudiante', 'Ese estudiante no esta en tus clases.'), cors);
  }
  await auditar(sql, docenteId, 'ver_estudiante', clase.id as string, estudianteId);
  const detalle = await detalleDeDia(sql, estudianteId, config.zonaHoraria, fecha);
  return responder({ status: 200, cuerpo: detalle }, cors);
};

const cambiarEscalon = async (ctx: Contexto, docenteId: string, estudianteId: string) => {
  const { req, sql, cors } = ctx;
  const cuerpo = await req.json().catch(() => null);
  const minimo = cuerpo?.minimo;
  if (!Number.isInteger(minimo) || minimo < 1 || minimo > 5) {
    return responder(rechazo(400, 'datos', 'minimo debe ser un entero de 1 a 5.'), cors);
  }
  const [clase] = await sql`
    SELECT c.id FROM clase_miembros m JOIN clases c ON c.id = m.clase_id
    WHERE m.user_id = ${estudianteId} AND c.docente_id = ${docenteId} LIMIT 1
  `;
  if (!clase) {
    return responder(rechazo(404, 'estudiante', 'Ese estudiante no esta en tus clases.'), cors);
  }
  const antes = (await escalonDelUsuario(sql, estudianteId)).actual;
  await sql`UPDATE users SET escalon_minimo = ${minimo} WHERE id = ${estudianteId}`;
  await auditar(sql, docenteId, 'cambiar_escalon', clase.id as string, estudianteId);
  const escalon = await escalonDelUsuario(sql, estudianteId);
  if (escalon.actual > antes) {
    await notificarSinFallar(sql, [{
      userId: estudianteId,
      tipo: 'escalon',
      clave: `escalon-${escalon.actual}`,
      datos: { escalon: escalon.actual },
    }]);
  }
  return responder({ status: 200, cuerpo: { escalon } }, cors);
};

export const AVISOS_DOCENTE_DIA = 3;
// Quita caracteres de control (salvo el salto de linea del texto) y espacios de los extremos.
const limpio = (valor: unknown, saltos: boolean): string =>
  typeof valor === 'string'
    ? valor.replace(saltos ? /[\u0000-\u0009\u000b-\u001f\u007f]/g : /[\u0000-\u001f\u007f]/g, '').trim()
    : '';

/** Valida el aviso del docente: titulo de 1 a 80 caracteres y texto de 1 a 500. */
export const validarAviso = (cuerpo: unknown) => {
  const c = (cuerpo ?? {}) as Record<string, unknown>;
  const titulo = limpio(c.titulo, false);
  const texto = limpio(c.texto, true);
  if (!titulo || titulo.length > 80 || !texto || texto.length > 500) return null;
  return { titulo, texto };
};

// POST /docente/clase/:id/ruta-guiada { activa }: la clase recorre la Ruta en orden (solo el dueño).
const cambiarRutaGuiada = async (ctx: Contexto, docenteId: string, claseId: string) => {
  const { req, sql, cors } = ctx;
  const cuerpo = await req.json().catch(() => ({})) as { activa?: unknown };
  if (typeof cuerpo.activa !== 'boolean') return responder(rechazo(400, 'datos', 'Indica si el modo guiado queda activo.'), cors);
  const [clase] = await sql`
    UPDATE clases SET ruta_guiada = ${cuerpo.activa}
    WHERE id = ${claseId} AND docente_id = ${docenteId}
    RETURNING ruta_guiada
  `;
  if (!clase) return responder(rechazo(404, 'clase', 'Esa clase no existe o no es tuya.'), cors);
  await auditar(sql, docenteId, 'ruta_guiada', claseId, null);
  return responder({ status: 200, cuerpo: { rutaGuiada: clase.ruta_guiada } }, cors);
};

// POST /docente/clase/:id/aviso { titulo, texto }: aviso a todos los estudiantes de la clase.
const avisarClase = async (ctx: Contexto, docenteId: string, claseId: string) => {
  const { req, sql, config, cors } = ctx;
  const aviso = validarAviso(await req.json().catch(() => null));
  if (!aviso) {
    return responder(rechazo(400, 'datos', 'Escribe un titulo (hasta 80) y un texto (hasta 500).'), cors);
  }
  const [clase] = await sql`SELECT id, nombre FROM clases WHERE id = ${claseId} AND docente_id = ${docenteId}`;
  if (!clase) return responder(rechazo(404, 'clase', 'Esa clase no existe o no es tuya.'), cors);

  const zona = config.zonaHoraria;
  const [{ hoy }] = await sql`
    SELECT count(*)::int AS hoy FROM auditoria_docente
    WHERE docente_id = ${docenteId} AND accion = 'avisar_clase'
      AND (creado_en AT TIME ZONE ${zona})::date = (now() AT TIME ZONE ${zona})::date
  `;
  if (hoy >= AVISOS_DOCENTE_DIA) {
    return responder(rechazo(429, 'avisos-dia', `Puedes enviar hasta ${AVISOS_DOCENTE_DIA} avisos al dia.`), cors);
  }

  const miembros = await sql`SELECT user_id FROM clase_miembros WHERE clase_id = ${claseId}`;
  // La misma clase, texto y dia dan la misma clave: un doble clic no duplica el aviso.
  const huella = await huellaCorta(`${aviso.titulo}\n${aviso.texto}\n${dia(zona)}`);
  const creados = await notificar(sql, miembros.map((m) => ({
    userId: m.user_id as string,
    tipo: 'docente',
    clave: `docente-${claseId}-${huella}`,
    datos: { ...aviso, clase: clase.nombre },
  })));
  if (creados) await auditar(sql, docenteId, 'avisar_clase', claseId, null);
  return responder({
    status: 201,
    cuerpo: { destinatarios: miembros.length, restantes: AVISOS_DOCENTE_DIA - hoy - (creados ? 1 : 0) },
  }, cors);
};

export const docente = async (
  ctx: Contexto,
  recurso: string | undefined,
  id: string | undefined,
  accion?: string,
): Promise<Response> => {
  const { req, sql, config, cors, identidad } = ctx;
  const cambio = recurso === 'estudiante' && accion === 'escalon';
  const aviso = recurso === 'clase' && accion === 'aviso';
  const guiada = recurso === 'clase' && accion === 'ruta-guiada';
  const escritura = cambio || aviso || guiada;
  const verDia = recurso === 'estudiante' && accion === 'dia';
  if (req.method !== (escritura ? 'POST' : 'GET') || (accion && !escritura && !verDia)) {
    return responder(rechazo(405, 'metodo', 'Metodo no permitido.'), cors);
  }
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
    if (cambio) return await cambiarEscalon(ctx, docenteId, id);
    if (aviso) return await avisarClase(ctx, docenteId, id);
    if (guiada) return await cambiarRutaGuiada(ctx, docenteId, id);
    if (verDia) return await diaDeEstudiante(ctx, docenteId, id);
    return recurso === 'clase'
      ? await panelDeClase(ctx, docenteId, id)
      : await fichaDeEstudiante(ctx, docenteId, id);
  } catch (error) {
    console.error('Docente error:', error);
    return responder(rechazo(500, 'docente', 'No se pudo cargar la vista docente.'), cors);
  }
};
