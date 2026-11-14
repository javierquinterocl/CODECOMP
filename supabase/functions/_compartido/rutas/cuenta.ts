// Mi cuenta: GET /cuenta (logros, foto, competencias, solicitud de borrado y, para el docente,
// sus competencias y las solicitudes pendientes), foto de perfil, cerrar sesion en todos los
// dispositivos, descarga de Mis datos y solicitudes de borrado (Ley 1581).

import type { Contexto } from '../contexto.ts';
import type { Sql } from '../db.ts';
import { esDocente } from '../auth.ts';
import { rechazo, responder } from '../http.ts';
import { idDeUsuario } from '../usuarios.ts';
import { escalonDelUsuario } from '../escalon.ts';
import { rachaDelUsuario } from '../racha.ts';
import { logrosDe } from '../logros.ts';
import { notificarSinFallar } from '../notificaciones.ts';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const MAX_FOTO = 61_440;

const no = (ctx: Contexto, status: number, codigo: string, mensaje: string) =>
  responder(rechazo(status, codigo, mensaje), ctx.cors);
const ok = (ctx: Contexto, cuerpo: Record<string, unknown>, status = 200) =>
  responder({ status, cuerpo }, ctx.cors);

/** Una foto valida es un JPEG (firma FF D8 FF) de 1 byte a 60 KB. */
export const fotoValida = (bytes: Uint8Array): boolean =>
  bytes.length > 3 && bytes.length <= MAX_FOTO && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;

/* ── Resumen ── */

const datosDeLogros = async (sql: Sql, userId: string, zona: string) => {
  const [[usuario], porNivel, catalogo, empezadas, racha, escalon] = await Promise.all([
    sql`SELECT solved_count FROM users WHERE id = ${userId}`,
    sql`
      SELECT e.nivel, count(DISTINCT e.id)::int AS hechos
      FROM fundamentos_envios f JOIN fundamentos_ejercicios e ON e.id = f.ejercicio_id
      WHERE f.user_id = ${userId} AND f.veredicto = 'ACEPTADO' AND e.is_active GROUP BY e.nivel
    `,
    // Con parametro a proposito: una consulta sin parametros en paralelo cuelga la conexion del pooler.
    sql`SELECT nivel, count(*)::int AS total FROM fundamentos_ejercicios WHERE is_active = ${true} GROUP BY nivel`,
    sql`
      SELECT count(*)::int AS n FROM competencia_miembros m JOIN competencias c ON c.cid = m.cid
      WHERE m.user_id = ${userId} AND c.inicio IS NOT NULL AND c.inicio <= now()
    `,
    rachaDelUsuario(sql, userId, zona),
    escalonDelUsuario(sql, userId),
  ]);
  const hechos = (nivel: string) => (porNivel.find((f) => f.nivel === nivel)?.hechos as number) ?? 0;
  const total = (nivel: string) => (catalogo.find((f) => f.nivel === nivel)?.total as number) ?? 0;
  return logrosDe({
    resueltos: Number(usuario?.solved_count ?? 0) + porNivel.reduce((s, f) => s + (f.hechos as number), 0),
    rachaMaxima: racha.maxima,
    // El piso que fija el docente no regala logros.
    escalonMerito: Math.max(escalon.porNivel, escalon.porResueltos),
    fundamentos: { hechos: hechos('fundamentos'), total: total('fundamentos') },
    practica: { hechos: hechos('practica'), total: total('practica') },
    competenciasEmpezadas: (empezadas[0]?.n as number) ?? 0,
  });
};

const resumen = async (ctx: Contexto, userId: string) => {
  const { sql, config, identidad } = ctx;
  const docente = esDocente(identidad, config.docentes);
  const [logros, [foto], [solicitud], competencias] = await Promise.all([
    datosDeLogros(sql, userId, config.zonaHoraria),
    sql`SELECT actualizada_en FROM foto_usuario WHERE user_id = ${userId}`,
    sql`SELECT id, creada_en FROM solicitudes_borrado WHERE user_id = ${userId} AND estado = 'pendiente'`,
    sql`
      SELECT c.cid, c.nombre, c.inicio, e.nombre AS equipo FROM competencia_miembros m
      JOIN competencias c ON c.cid = m.cid
      JOIN competencia_equipos e ON e.team_id = m.team_id AND e.cid = m.cid
      WHERE m.user_id = ${userId} AND NOT c.archivada ORDER BY c.inicio NULLS LAST
    `,
  ]);
  const proxima = competencias.find((c) => c.inicio && (c.inicio as Date).getTime() > Date.now()) ?? null;
  const cuerpo: Record<string, unknown> = {
    logros,
    fotoVersion: foto ? (foto.actualizada_en as Date).getTime() : null,
    solicitudBorrado: solicitud ?? null,
    competencias: { total: competencias.length, proxima },
  };
  if (docente) {
    const [jurado, pendientes] = await Promise.all([
      sql`
        SELECT cid, nombre, inicio, archivada FROM competencias WHERE creada_por = ${userId}
        ORDER BY inicio DESC NULLS LAST LIMIT 20
      `,
      sql`
        SELECT id, email, firebase_uid, creada_en FROM solicitudes_borrado
        WHERE estado = ${'pendiente'} ORDER BY creada_en
      `,
    ]);
    cuerpo.docente = { competencias: jurado, solicitudesBorrado: pendientes };
  }
  return ok(ctx, cuerpo);
};

/* ── Foto ── */

const verFoto = async (ctx: Contexto, userId: string, pedido: string | undefined) => {
  const { sql, cors } = ctx;
  // "yo" = la propia: la cabecera no conoce el id interno del usuario.
  const duenoId = pedido === 'yo' ? userId : pedido;
  if (!duenoId || !UUID.test(duenoId)) return no(ctx, 400, 'datos', 'Usuario no valido.');
  // La ven el propio usuario y el docente de una de sus clases.
  const [fila] = await sql`
    SELECT f.datos FROM foto_usuario f
    WHERE f.user_id = ${duenoId} AND (f.user_id = ${userId} OR EXISTS (
      SELECT 1 FROM clase_miembros m JOIN clases c ON c.id = m.clase_id
      WHERE m.user_id = f.user_id AND c.docente_id = ${userId}))
  `;
  if (!fila) return no(ctx, 404, 'sin-foto', 'Sin foto.');
  return new Response(new Uint8Array(fila.datos as Uint8Array), {
    status: 200,
    headers: {
      ...cors,
      'Content-Type': 'image/jpeg',
      'Cache-Control': 'private, max-age=86400',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'",
    },
  });
};

const subirFoto = async (ctx: Contexto, userId: string) => {
  const { req, url, sql } = ctx;
  if (url.searchParams.get('consentimiento') !== '1') {
    return no(ctx, 400, 'consentimiento', 'Autoriza mostrar tu foto antes de subirla.');
  }
  if (Number(req.headers.get('content-length') ?? 0) > MAX_FOTO) {
    return no(ctx, 413, 'foto-grande', 'La foto pesa mas de 60 KB.');
  }
  const bytes = new Uint8Array(await req.arrayBuffer());
  if (!fotoValida(bytes)) return no(ctx, 400, 'foto', 'La foto debe ser un JPEG de hasta 60 KB.');
  const [fila] = await sql`
    INSERT INTO foto_usuario (user_id, datos) VALUES (${userId}, ${bytes})
    ON CONFLICT (user_id) DO UPDATE SET datos = EXCLUDED.datos, actualizada_en = now()
    RETURNING actualizada_en
  `;
  return ok(ctx, { fotoVersion: (fila.actualizada_en as Date).getTime() });
};

/* ── Mis datos ── */

const misDatos = async (ctx: Contexto, userId: string) => {
  const { sql } = ctx;
  // Columnas explicitas: nada interno (judge0_token, casos ocultos) ni de otras personas.
  const [
    [perfil], [foto], envios, resultados, envFundamentos, pistas, pistasFund, actividad,
    tiempoEjercicios, aperturas, notificaciones, clases, clasesDocente, competencias, accesos, borrado,
  ] = await Promise.all([
    sql`
      SELECT username, email, created_at, nivel, global_rating, solved_count, attempted_count,
        escalon_minimo, datos_autorizados, datos_respondido_en, avisos_correo, correo_verificado
      FROM users WHERE id = ${userId}
    `,
    sql`SELECT encode(datos, 'base64') AS jpeg_base64, actualizada_en FROM foto_usuario WHERE user_id = ${userId}`,
    sql`
      SELECT s.created_at, p.problem_number, p.title, s.language_id, s.verdict, s.caso_fallido,
        s.execution_time_sec, s.memory_used_kb, s.rating_change, s.source_code
      FROM submissions s JOIN problems p ON p.id = s.problem_id
      WHERE s.user_id = ${userId} ORDER BY s.created_at
    `,
    sql`
      SELECT r.cerrado_en, p.problem_number, r.aceptado, r.puntaje, r.esperado, r.cambio, r.nivel_despues
      FROM resultados_problema r JOIN problems p ON p.id = r.problem_id
      WHERE r.user_id = ${userId} ORDER BY r.cerrado_en
    `,
    sql`
      SELECT f.creado_en, e.nivel, e.numero, e.titulo, f.veredicto, f.ejemplo_fallido, f.oculto, f.codigo
      FROM fundamentos_envios f JOIN fundamentos_ejercicios e ON e.id = f.ejercicio_id
      WHERE f.user_id = ${userId} ORDER BY f.creado_en
    `,
    sql`
      SELECT x.creado_en, p.problem_number, x.veredicto, x.pista
      FROM pistas x JOIN problems p ON p.id = x.problem_id WHERE x.user_id = ${userId} ORDER BY x.creado_en
    `,
    sql`
      SELECT x.creado_en, e.nivel, e.numero, x.veredicto, x.pista
      FROM fundamentos_pistas x JOIN fundamentos_ejercicios e ON e.id = x.ejercicio_id
      WHERE x.user_id = ${userId} ORDER BY x.creado_en
    `,
    sql`
      SELECT dia::text, segundos_activos, pegados, caracteres_pegados
      FROM actividad_diaria WHERE user_id = ${userId} ORDER BY dia
    `,
    sql`
      SELECT a.dia::text, a.segundos, p.problem_number, e.nivel, e.numero
      FROM actividad_ejercicio a LEFT JOIN problems p ON p.id = a.problem_id
      LEFT JOIN fundamentos_ejercicios e ON e.id = a.ejercicio_id
      WHERE a.user_id = ${userId} ORDER BY a.dia
    `,
    sql`
      SELECT p.problem_number, a.primera, a.ultima FROM aperturas_problema a
      JOIN problems p ON p.id = a.problem_id WHERE a.user_id = ${userId}
    `,
    sql`SELECT tipo, datos, creada_en, leida_en FROM notificaciones WHERE user_id = ${userId} ORDER BY creada_en`,
    sql`
      SELECT c.nombre, m.unido_en FROM clase_miembros m JOIN clases c ON c.id = m.clase_id
      WHERE m.user_id = ${userId}
    `,
    sql`SELECT nombre, codigo, creado_en FROM clases WHERE docente_id = ${userId}`,
    sql`
      SELECT c.nombre AS competencia, c.inicio, e.nombre AS equipo, m.unido_en
      FROM competencia_miembros m JOIN competencias c ON c.cid = m.cid
      JOIN competencia_equipos e ON e.team_id = m.team_id AND e.cid = m.cid WHERE m.user_id = ${userId}
    `,
    sql`
      SELECT accion, creado_en FROM auditoria_docente WHERE estudiante_id = ${userId} ORDER BY creado_en
    `,
    sql`SELECT estado, creada_en, resuelta_en FROM solicitudes_borrado WHERE user_id = ${userId}`,
  ]);
  return ok(ctx, {
    generado_en: new Date().toISOString(),
    perfil,
    foto: foto ?? null,
    problemas: { envios, resultados, pistas, aperturas },
    fundamentos: { envios: envFundamentos, pistas: pistasFund },
    actividad: { diaria: actividad, por_ejercicio: tiempoEjercicios },
    notificaciones,
    clases: { miembro: clases, docente: clasesDocente },
    competencias,
    accesos_de_docentes: accesos,
    solicitudes_de_borrado: borrado,
  });
};

/* ── Borrado ── */

const pedirBorrado = async (ctx: Contexto, userId: string) => {
  const { sql, config, identidad } = ctx;
  // Borrar a un docente borraria sus clases en cascada: lo gestiona el administrador.
  if (esDocente(identidad, config.docentes)) {
    return no(ctx, 403, 'docente', 'Las cuentas de docente no se borran desde aqui.');
  }
  const [hecha] = await sql`
    INSERT INTO solicitudes_borrado (user_id, firebase_uid, email)
    SELECT id, firebase_uid, email FROM users WHERE id = ${userId}
    ON CONFLICT (user_id) WHERE estado = 'pendiente' DO NOTHING
    RETURNING id, creada_en
  `;
  if (!hecha) return no(ctx, 409, 'pendiente', 'Ya tienes una solicitud de borrado pendiente.');
  // A los docentes solo les llega el id: ni nombre ni correo en su campana.
  const docentes = await sql`SELECT id FROM users WHERE lower(email) = ANY(${[...config.docentes]}::text[])`;
  await notificarSinFallar(sql, docentes.map((d) => ({
    userId: d.id as string,
    tipo: 'borrado',
    clave: `borrado-${hecha.id}`,
    datos: { solicitud: hecha.id },
  })));
  return ok(ctx, { solicitudBorrado: hecha }, 201);
};

const cancelarBorrado = async (ctx: Contexto, userId: string) => {
  const { sql } = ctx;
  const [cancelada] = await sql`
    UPDATE solicitudes_borrado SET estado = 'cancelada', resuelta_en = now()
    WHERE user_id = ${userId} AND estado = 'pendiente' RETURNING id
  `;
  if (!cancelada) return no(ctx, 404, 'sin-solicitud', 'No tienes una solicitud pendiente.');
  await sql`DELETE FROM notificaciones WHERE clave = ${`borrado-${cancelada.id}`}`;
  return ok(ctx, { solicitudBorrado: null });
};

const ejecutarBorrado = async (ctx: Contexto, docenteId: string, solicitudId: string | undefined) => {
  const { sql, config, identidad } = ctx;
  if (!esDocente(identidad, config.docentes)) return no(ctx, 403, 'rol', 'Solo un docente puede ejecutarlo.');
  if (!solicitudId || !UUID.test(solicitudId)) return no(ctx, 400, 'datos', 'Solicitud no valida.');
  const [s] = await sql`
    SELECT s.id, s.user_id, s.firebase_uid, u.email FROM solicitudes_borrado s
    LEFT JOIN users u ON u.id = s.user_id WHERE s.id = ${solicitudId} AND s.estado = 'pendiente'
  `;
  if (!s) return no(ctx, 404, 'sin-solicitud', 'Esa solicitud no existe o ya se resolvio.');
  if (s.email && config.docentes.has(String(s.email).toLowerCase())) {
    return no(ctx, 409, 'docente', 'Esa cuenta es de un docente: no se borra desde aqui.');
  }
  await sql.begin(async (tx) => {
    if (s.user_id) {
      // Primero la auditoria (con el estudiante aun existente) y la tabla sin clave foranea.
      await tx`
        INSERT INTO auditoria_docente (docente_id, estudiante_id, accion)
        VALUES (${docenteId}, ${s.user_id}, 'ejecutar_borrado')
      `;
      await tx`DELETE FROM users_rating_previo_016 WHERE user_id = ${s.user_id}`;
    }
    await tx`
      UPDATE solicitudes_borrado SET estado = 'ejecutada', resuelta_en = now(), resuelta_por = ${docenteId}
      WHERE id = ${s.id}
    `;
    await tx`DELETE FROM notificaciones WHERE clave = ${`borrado-${s.id}`}`;
    if (s.user_id) await tx`DELETE FROM users WHERE id = ${s.user_id}`;
  });
  return ok(ctx, { firebaseUid: s.firebase_uid });
};

/* ── Despacho ── */

export const cuenta = async (ctx: Contexto, segmentos: string[]): Promise<Response> => {
  const { req, sql, identidad } = ctx;
  if (!identidad) return no(ctx, 401, 'sin-sesion', 'Inicia sesion para ver tu cuenta.');
  const [recurso, id, accion] = segmentos;
  const m = req.method;
  try {
    const userId = await idDeUsuario(sql, identidad);
    if (!recurso && m === 'GET') return await resumen(ctx, userId);
    if (recurso === 'foto' && m === 'GET') return await verFoto(ctx, userId, id);
    if (recurso === 'foto' && !id && m === 'POST') return await subirFoto(ctx, userId);
    if (recurso === 'foto' && !id && m === 'DELETE') {
      await sql`DELETE FROM foto_usuario WHERE user_id = ${userId}`;
      return ok(ctx, { fotoVersion: null });
    }
    if (recurso === 'cerrar-sesiones' && m === 'POST') {
      await sql`UPDATE users SET sesiones_desde = date_trunc('second', now()) WHERE id = ${userId}`;
      return ok(ctx, { ok: true });
    }
    if (recurso === 'datos' && m === 'GET') return await misDatos(ctx, userId);
    if (recurso === 'borrado' && !id && m === 'POST') return await pedirBorrado(ctx, userId);
    if (recurso === 'borrado' && !id && m === 'DELETE') return await cancelarBorrado(ctx, userId);
    if (recurso === 'borrado' && accion === 'ejecutar' && m === 'POST') {
      return await ejecutarBorrado(ctx, userId, id);
    }
    return no(ctx, 404, 'ruta', 'Ruta no encontrada.');
  } catch (error) {
    console.error('Cuenta error:', error);
    return no(ctx, 500, 'cuenta', 'No se pudo completar la operacion.');
  }
};
