// Panel del jurado: organiza competencias en DOMjudge desde CODECOMP. Solo docentes; cada
// cambio se audita. DOMjudge juzga; Postgres guarda equipos, integrantes y origen de problemas.

import type { Contexto } from '../contexto.ts';
import { esDocente } from '../auth.ts';
import { rechazo, responder } from '../http.ts';
import { idDeUsuario } from '../usuarios.ts';
import { equiposDelConcurso, liberarProblema, reservarProblema } from '../competencias.ts';
import {
  type AclaracionDJ,
  colorDeGlobo,
  concursoJson,
  type ConcursoDJ,
  type EnvioDJ,
  type FilaMarcadorDJ,
  filasMarcador,
  type JuicioDJ,
  veredictosPorEnvio,
  cuentaJson,
  equipoJson,
  ErrorDJ,
  escribirDJ,
  estadoDe,
  formularioConArchivo,
  idConcurso,
  idEquipo,
  idProblemaDJ,
  isoBogota,
  jsonDJ,
  paqueteKattis,
  pedirDJ,
  type ProblemaDJ,
  segundosDe,
} from '../domjudge.ts';

type Accion =
  | 'competencia_crear'
  | 'competencia_editar'
  | 'competencia_equipos'
  | 'competencia_problemas'
  | 'competencia_dirigir';

const CID = /^[a-z0-9-]{3,60}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_ZIP = 20 * 1024 * 1024;

const ok = (ctx: Contexto, cuerpo: Record<string, unknown>, status = 200) =>
  responder({ status, cuerpo }, ctx.cors);
const no = (ctx: Contexto, status: number, codigo: string, mensaje: string) =>
  responder(rechazo(status, codigo, mensaje), ctx.cors);

const auditar = (ctx: Contexto, docenteId: string, accion: Accion, detalle: string) =>
  ctx.sql`
    INSERT INTO auditoria_docente (docente_id, accion, detalle)
    VALUES (${docenteId}, ${accion}, ${detalle.slice(0, 300)})
  `;

const cuerpoJson = async (ctx: Contexto): Promise<Record<string, unknown>> => {
  try {
    const d = await ctx.req.json();
    return d && typeof d === 'object' ? d : {};
  } catch {
    return {};
  }
};

const claveAleatoria = (): string => {
  const letras = 'abcdefghjkmnpqrstuvwxyz23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  return Array.from(bytes, (b) => letras[b % letras.length]).join('');
};

// Caches cortas por instancia: el concurso cambia poco y el id del docente nunca cambia.
const CONCURSO_MS = 5_000;
const concursos = new Map<string, { hasta: number; valor: ConcursoDJ }>();
const docentes = new Map<string, string>();

const concursoDJ = async (ctx: Contexto, cid: string, fresco = false): Promise<ConcursoDJ> => {
  const hit = concursos.get(cid);
  if (!fresco && hit && hit.hasta > Date.now()) return hit.valor;
  const valor = await jsonDJ<ConcursoDJ>(ctx.config, `/contests/${encodeURIComponent(cid)}`);
  concursos.set(cid, { hasta: Date.now() + CONCURSO_MS, valor });
  return valor;
};

const docenteDe = async (ctx: Contexto): Promise<string> => {
  const uid = ctx.identidad!.uid;
  const id = docentes.get(uid) ?? await idDeUsuario(ctx.sql, ctx.identidad!);
  docentes.set(uid, id);
  return id;
};

const resumenConcurso = (c: ConcursoDJ) => ({
  inicio: c.start_time,
  fin: c.end_time,
  congeladoSegundos: segundosDe(c.scoreboard_freeze_duration),
  estado: estadoDe(c),
});

// ── Competencias ──

const listar = async (ctx: Contexto) => {
  const filas = await ctx.sql<{ cid: string; nombre: string; archivada: boolean; creada_en: Date }[]>`
    SELECT cid, nombre, archivada, creada_en FROM competencias ORDER BY creada_en DESC
  `;
  const concursos = await jsonDJ<ConcursoDJ[]>(ctx.config, '/contests');
  const porId = new Map(concursos.map((c) => [c.id, c]));
  const equipos = await ctx.sql<{ cid: string; n: number }[]>`
    SELECT cid, count(*)::int AS n FROM competencia_equipos WHERE NOT retirado GROUP BY cid
  `;
  const nEquipos = new Map(equipos.map((e) => [e.cid, e.n]));
  return ok(ctx, {
    competencias: filas.map((f) => {
      const c = porId.get(f.cid);
      return {
        cid: f.cid,
        nombre: f.nombre,
        archivada: f.archivada,
        equipos: nEquipos.get(f.cid) ?? 0,
        ...(c ? resumenConcurso(c) : { inicio: null, fin: null, congeladoSegundos: 0, estado: 'sin-juez' }),
      };
    }),
  });
};

const crear = async (ctx: Contexto, docenteId: string) => {
  const d = await cuerpoJson(ctx);
  const nombre = String(d.nombre ?? '').trim().replace(/\s+/g, ' ');
  const inicio = new Date(String(d.inicio ?? ''));
  const duracionMin = Number(d.duracionMin);
  const congeladoMin = Number(d.congeladoMin ?? 0);
  if (nombre.length < 3 || nombre.length > 120) return no(ctx, 400, 'nombre', 'El nombre debe tener entre 3 y 120 caracteres.');
  if (isNaN(inicio.getTime()) || inicio.getTime() < Date.now() + 2 * 60_000) {
    return no(ctx, 400, 'inicio', 'La hora de inicio debe ser al menos 2 minutos en el futuro.');
  }
  if (!Number.isInteger(duracionMin) || duracionMin < 30 || duracionMin > 720) {
    return no(ctx, 400, 'duracion', 'La duracion va de 30 minutos a 12 horas.');
  }
  if (!Number.isInteger(congeladoMin) || congeladoMin < 0 || congeladoMin >= duracionMin) {
    return no(ctx, 400, 'congelado', 'El congelado debe ser menor que la duracion.');
  }
  const cid = idConcurso(nombre, inicio);
  const [existe] = await ctx.sql`SELECT 1 FROM competencias WHERE cid = ${cid}`;
  if (existe) return no(ctx, 409, 'existe', 'Ya hay una competencia con ese nombre ese dia.');

  const json = JSON.stringify(concursoJson({ cid, nombre, inicio, duracionMin, congeladoMin }));
  await escribirDJ(ctx.config, '/contests', {
    cuerpo: formularioConArchivo('json', 'contest.json', json, 'application/json'),
  });
  await ctx.sql`
    INSERT INTO competencias (cid, nombre, creada_por) VALUES (${cid}, ${nombre}, ${docenteId})
  `;
  await auditar(ctx, docenteId, 'competencia_crear', cid);
  return ok(ctx, { cid }, 201);
};

const detalle = async (ctx: Contexto, cid: string) => {
  const [comp] = await ctx.sql<{ nombre: string; archivada: boolean }[]>`
    SELECT nombre, archivada FROM competencias WHERE cid = ${cid}
  `;
  if (!comp) return no(ctx, 404, 'competencia', 'Competencia no encontrada.');
  const [concurso, problemasDJ, equipos, miembros, problemas] = await Promise.all([
    concursoDJ(ctx, cid, true),
    jsonDJ<(ProblemaDJ & { test_data_count?: number })[]>(ctx.config, `/contests/${cid}/problems`),
    ctx.sql<{ team_id: string; nombre: string; retirado: boolean }[]>`
      SELECT team_id, nombre, retirado FROM competencia_equipos WHERE cid = ${cid} ORDER BY creado_en
    `,
    ctx.sql<{ team_id: string; user_id: string; username: string; email: string }[]>`
      SELECT m.team_id, m.user_id, u.username, u.email FROM competencia_miembros m
      JOIN users u ON u.id = m.user_id WHERE m.cid = ${cid} ORDER BY m.unido_en
    `,
    ctx.sql<{ dj_problem_id: string; problem_number: number | null; titulo: string | null; liberado: boolean }[]>`
      SELECT cp.dj_problem_id, p.problem_number, coalesce(p.title_es, p.title) AS titulo, cp.liberado
      FROM competencia_problemas cp LEFT JOIN problems p ON p.id = cp.problem_id
      WHERE cp.cid = ${cid}
    `,
  ]);
  const origen = new Map(problemas.map((p) => [p.dj_problem_id, p]));
  return ok(ctx, {
    competencia: { cid, nombre: comp.nombre, archivada: comp.archivada, ...resumenConcurso(concurso) },
    equipos: equipos.map((e) => ({
      teamId: e.team_id,
      nombre: e.nombre,
      retirado: e.retirado,
      miembros: miembros.filter((m) => m.team_id === e.team_id)
        .map((m) => ({ userId: m.user_id, usuario: m.username, correo: m.email })),
    })),
    problemas: [...problemasDJ].sort((a, b) => a.label.localeCompare(b.label)).map((p) => {
      const o = origen.get(p.id);
      return {
        djId: p.id,
        letra: p.label,
        nombre: p.name,
        limiteSegundos: p.time_limit ?? null,
        casos: p.test_data_count ?? null,
        color: p.rgb ?? null,
        banco: o?.problem_number ? { numero: o.problem_number, titulo: o.titulo } : null,
        liberado: o?.liberado ?? false,
      };
    }),
  });
};

const cambiarInicio = async (ctx: Contexto, docenteId: string, cid: string) => {
  const inicio = new Date(String((await cuerpoJson(ctx)).inicio ?? ''));
  if (isNaN(inicio.getTime()) || inicio.getTime() < Date.now() + 60_000) {
    return no(ctx, 400, 'inicio', 'La nueva hora debe ser al menos 1 minuto en el futuro.');
  }
  if (estadoDe(await concursoDJ(ctx, cid, true)) !== 'antes') {
    return no(ctx, 409, 'empezo', 'La competencia ya empezo: DOMjudge no deja cambiar su hora.');
  }
  await escribirDJ(ctx.config, `/contests/${cid}`, {
    metodo: 'PATCH',
    tipo: 'application/json',
    cuerpo: JSON.stringify({ id: cid, start_time: isoBogota(inicio) }),
  });
  concursos.delete(cid);
  await auditar(ctx, docenteId, 'competencia_editar', `${cid} inicio ${inicio.toISOString()}`);
  return ok(ctx, { cid });
};

const archivar = async (ctx: Contexto, docenteId: string, cid: string) => {
  const archivada = (await cuerpoJson(ctx)).archivada !== false;
  await ctx.sql`UPDATE competencias SET archivada = ${archivada} WHERE cid = ${cid}`;
  await auditar(ctx, docenteId, 'competencia_editar', `${cid} archivada ${archivada}`);
  return ok(ctx, { cid, archivada });
};

// ── Equipos ──

const crearEquipo = async (ctx: Contexto, docenteId: string, cid: string) => {
  const nombre = String((await cuerpoJson(ctx)).nombre ?? '').trim().replace(/\s+/g, ' ');
  if (nombre.length < 2 || nombre.length > 80) return no(ctx, 400, 'nombre', 'El nombre debe tener entre 2 y 80 caracteres.');
  const teamId = idEquipo(cid, nombre);
  const [existe] = await ctx.sql`SELECT 1 FROM competencia_equipos WHERE team_id = ${teamId}`;
  if (existe) return no(ctx, 409, 'existe', 'Ya hay un equipo con ese nombre en esta competencia.');

  const clave = claveAleatoria();
  await escribirDJ(ctx.config, '/teams', {
    tipo: 'application/json',
    cuerpo: JSON.stringify(equipoJson(teamId, nombre)),
  });
  await escribirDJ(ctx.config, '/users/accounts', {
    cuerpo: formularioConArchivo('json', 'accounts.json', JSON.stringify([cuentaJson(teamId, nombre, clave)]), 'application/json'),
  });
  await ctx.sql`INSERT INTO competencia_equipos (team_id, cid, nombre) VALUES (${teamId}, ${cid}, ${nombre})`;
  await auditar(ctx, docenteId, 'competencia_equipos', `${cid} crear ${teamId}`);
  return ok(ctx, { teamId, nombre, usuario: teamId, clave }, 201);
};

const editarEquipo = async (ctx: Contexto, docenteId: string, cid: string, teamId: string) => {
  const d = await cuerpoJson(ctx);
  const [eq] = await ctx.sql<{ nombre: string }[]>`
    SELECT nombre FROM competencia_equipos WHERE team_id = ${teamId} AND cid = ${cid}
  `;
  if (!eq) return no(ctx, 404, 'equipo', 'Equipo no encontrado.');
  if (typeof d.nombre === 'string' && d.nombre.trim() !== eq.nombre) {
    const nombre = d.nombre.trim().replace(/\s+/g, ' ');
    if (nombre.length < 2 || nombre.length > 80) return no(ctx, 400, 'nombre', 'El nombre debe tener entre 2 y 80 caracteres.');
    // Reimportar el registro completo: sin grupo u organizacion DOMjudge los deja en blanco.
    await escribirDJ(ctx.config, '/users/teams', {
      cuerpo: formularioConArchivo('json', 'teams.json', JSON.stringify([equipoJson(teamId, nombre)]), 'application/json'),
    });
    await ctx.sql`UPDATE competencia_equipos SET nombre = ${nombre} WHERE team_id = ${teamId}`;
  }
  if (typeof d.retirado === 'boolean') {
    await ctx.sql`UPDATE competencia_equipos SET retirado = ${d.retirado} WHERE team_id = ${teamId}`;
  }
  await auditar(ctx, docenteId, 'competencia_equipos', `${cid} editar ${teamId}`);
  return ok(ctx, { teamId });
};

const nuevaClave = async (ctx: Contexto, docenteId: string, cid: string, teamId: string) => {
  const [eq] = await ctx.sql<{ nombre: string }[]>`
    SELECT nombre FROM competencia_equipos WHERE team_id = ${teamId} AND cid = ${cid}
  `;
  if (!eq) return no(ctx, 404, 'equipo', 'Equipo no encontrado.');
  const clave = claveAleatoria();
  await escribirDJ(ctx.config, '/users/accounts', {
    cuerpo: formularioConArchivo('json', 'accounts.json', JSON.stringify([cuentaJson(teamId, eq.nombre, clave)]), 'application/json'),
  });
  await auditar(ctx, docenteId, 'competencia_equipos', `${cid} clave ${teamId}`);
  return ok(ctx, { usuario: teamId, clave });
};

const MAX_INTEGRANTES = 3;

/** Como en la ICPC, el equipo queda fijo cuando empieza la competencia. */
const integrantesFijos = async (ctx: Contexto, cid: string) =>
  estadoDe(await concursoDJ(ctx, cid)) !== 'antes'
    ? no(ctx, 409, 'empezo', 'Los integrantes quedan fijos cuando empieza la competencia.')
    : null;

const agregarMiembro = async (ctx: Contexto, docenteId: string, cid: string, teamId: string) => {
  const userId = String((await cuerpoJson(ctx)).userId ?? '');
  if (!UUID.test(userId)) return no(ctx, 400, 'usuario', 'Estudiante no valido.');
  // Una sola consulta para todas las validaciones, en paralelo con el estado del concurso.
  const [fijo, [v]] = await Promise.all([
    integrantesFijos(ctx, cid),
    ctx.sql<{ equipo: boolean; n: number; usuario: string | null; correo: string | null; otro: string | null }[]>`
      SELECT
        EXISTS (SELECT 1 FROM competencia_equipos WHERE team_id = ${teamId} AND cid = ${cid}) AS equipo,
        (SELECT count(*)::int FROM competencia_miembros WHERE team_id = ${teamId}) AS n,
        (SELECT username FROM users WHERE id = ${userId}) AS usuario,
        (SELECT email FROM users WHERE id = ${userId}) AS correo,
        (SELECT e.nombre FROM competencia_miembros m JOIN competencia_equipos e ON e.team_id = m.team_id
          WHERE m.cid = ${cid} AND m.user_id = ${userId}) AS otro
    `,
  ]);
  if (!v.equipo) return no(ctx, 404, 'equipo', 'Equipo no encontrado.');
  if (fijo) return fijo;
  if (v.n >= MAX_INTEGRANTES) return no(ctx, 409, 'lleno', `El equipo ya tiene ${MAX_INTEGRANTES} integrantes.`);
  if (!v.correo) return no(ctx, 404, 'usuario', 'Estudiante no encontrado.');
  if (v.otro) return no(ctx, 409, 'otro-equipo', `Ya esta en el equipo ${v.otro} de esta competencia.`);
  await ctx.sql`
    INSERT INTO competencia_miembros (team_id, cid, user_id) VALUES (${teamId}, ${cid}, ${userId})
  `;
  await auditar(ctx, docenteId, 'competencia_equipos', `${cid} agregar ${userId} a ${teamId}`);
  return ok(ctx, { teamId, miembro: { userId, usuario: v.usuario, correo: v.correo } }, 201);
};

const quitarMiembro = async (ctx: Contexto, docenteId: string, cid: string, teamId: string, userId: string) => {
  if (!UUID.test(userId)) return no(ctx, 400, 'usuario', 'Estudiante no valido.');
  const fijo = await integrantesFijos(ctx, cid);
  if (fijo) return fijo;
  await ctx.sql`
    DELETE FROM competencia_miembros WHERE team_id = ${teamId} AND cid = ${cid} AND user_id = ${userId}
  `;
  await auditar(ctx, docenteId, 'competencia_equipos', `${cid} quitar ${userId} de ${teamId}`);
  return ok(ctx, { teamId, userId });
};

/** GET /jurado/estudiantes?q=: cuentas de CODECOMP por correo o usuario. */
const buscarEstudiantes = async (ctx: Contexto) => {
  const q = (ctx.url.searchParams.get('q') ?? '').trim().toLowerCase();
  if (q.length < 2) return ok(ctx, { estudiantes: [] });
  const patron = `%${q.replace(/[\\%_]/g, (c) => '\\' + c)}%`;
  const filas = await ctx.sql<{ id: string; username: string; email: string; firebase_uid: string | null }[]>`
    SELECT id, username, email, firebase_uid FROM users
    WHERE lower(email) LIKE ${patron} OR lower(username) LIKE ${patron}
    ORDER BY email LIMIT 20
  `;
  return ok(ctx, {
    estudiantes: filas.map((f) => ({ userId: f.id, usuario: f.username, correo: f.email, uid: f.firebase_uid })),
  });
};

// ── Problemas ──

/** GET /jurado/banco?q=: problemas del banco con casos, activos o reservados por otra competencia. */
const buscarBanco = async (ctx: Contexto) => {
  const q = (ctx.url.searchParams.get('q') ?? '').trim().toLowerCase();
  if (q.length < 2) return ok(ctx, { problemas: [] });
  const numero = /^\d+$/.test(q) ? Number(q) : -1;
  const patron = `%${q.replace(/[\\%_]/g, (c) => '\\' + c)}%`;
  const filas = await ctx.sql<{ problem_number: number; titulo: string; difficulty_rating: number; reservado: boolean; casos: number }[]>`
    SELECT p.problem_number, coalesce(p.title_es, p.title) AS titulo, p.difficulty_rating,
      'torneo' = ANY(p.deactivation_reasons) AS reservado,
      (SELECT count(*)::int FROM test_cases t WHERE t.problem_id = p.id) AS casos
    FROM problems p
    WHERE (p.is_active OR p.deactivation_reasons = ARRAY['torneo'])
      AND (p.problem_number = ${numero} OR lower(p.title) LIKE ${patron} OR lower(coalesce(p.title_es, '')) LIKE ${patron})
    ORDER BY (p.fuente IS NULL), p.problem_number LIMIT 20
  `;
  return ok(ctx, {
    problemas: filas.filter((f) => f.casos > 0).map((f) => ({
      numero: f.problem_number,
      titulo: f.titulo,
      rating: f.difficulty_rating,
      reservado: f.reservado,
      casos: f.casos,
    })),
  });
};

const LETRA = /^[A-Z]$/;

/** Enlaza un problema subido a DOMjudge con su letra y el color de su globo. */
const enlazarConLetra = async (ctx: Contexto, cid: string, djId: string, letra: string) => {
  await pedirDJ(ctx.config, `/contests/${cid}/problems/${encodeURIComponent(djId)}`, { metodo: 'DELETE' });
  await escribirDJ(ctx.config, `/contests/${cid}/problems/${encodeURIComponent(djId)}`, {
    metodo: 'PUT',
    tipo: 'application/json',
    cuerpo: JSON.stringify({ label: letra, color: colorDeGlobo(letra) }),
  });
};

const letraLibre = async (ctx: Contexto, cid: string, letra: string) => {
  const problemas = await jsonDJ<ProblemaDJ[]>(ctx.config, `/contests/${cid}/problems`);
  return !problemas.some((p) => p.label === letra);
};

const agregarDelBanco = async (ctx: Contexto, docenteId: string, cid: string) => {
  const d = await cuerpoJson(ctx);
  const numero = Number(d.numero);
  const letra = String(d.letra ?? '').toUpperCase();
  if (!LETRA.test(letra)) return no(ctx, 400, 'letra', 'La letra va de la A a la Z.');
  if (!(await letraLibre(ctx, cid, letra))) return no(ctx, 409, 'letra', `La letra ${letra} ya esta usada.`);
  const [p] = await ctx.sql<{ id: string; slug: string; title: string; title_es: string | null; description_markdown: string; description_markdown_es: string | null; time_limit_sec: number; memory_limit_mb: number; fuente: string | null }[]>`
    SELECT id, slug, title, title_es, description_markdown, description_markdown_es, time_limit_sec,
      memory_limit_mb, fuente FROM problems
    WHERE problem_number = ${numero} AND (is_active OR deactivation_reasons = ARRAY['torneo'])
  `;
  if (!p) return no(ctx, 404, 'problema', 'Ese problema no esta disponible en el banco.');
  const [ya] = await ctx.sql`
    SELECT 1 FROM competencia_problemas WHERE cid = ${cid} AND problem_id = ${p.id}
  `;
  if (ya) return no(ctx, 409, 'repetido', 'Ese problema ya esta en esta competencia.');
  const casos = await ctx.sql<{ input: string; expected_output: string; is_hidden: boolean }[]>`
    SELECT input, expected_output, is_hidden FROM test_cases WHERE problem_id = ${p.id} ORDER BY is_hidden, id
  `;
  if (!casos.length) return no(ctx, 409, 'sin-casos', 'Ese problema no tiene casos de prueba.');

  const djId = idProblemaDJ(p.slug, cid);
  const zip = paqueteKattis({
    titulo: p.title_es || p.title,
    enunciado: p.description_markdown_es || p.description_markdown,
    limiteSegundos: Number(p.time_limit_sec) || 1,
    memoriaMb: Number(p.memory_limit_mb) || 256,
    fuente: p.fuente,
    casos: casos.map((c) => ({ entrada: c.input, salida: c.expected_output, oculto: c.is_hidden })),
  }, letra);
  await escribirDJ(ctx.config, `/contests/${cid}/problems`, {
    cuerpo: formularioConArchivo('zip', `${djId}.zip`, zip, 'application/zip'),
  });
  await enlazarConLetra(ctx, cid, djId, letra);
  await ctx.sql.begin(async (tx) => {
    await tx`
      INSERT INTO competencia_problemas (cid, dj_problem_id, problem_id, letra)
      VALUES (${cid}, ${djId}, ${p.id}, ${letra})
    `;
    await reservarProblema(tx, p.id);
  });
  await auditar(ctx, docenteId, 'competencia_problemas', `${cid} banco ${numero} como ${letra}`);
  return ok(ctx, { djId, letra }, 201);
};

const subirZip = async (ctx: Contexto, docenteId: string, cid: string) => {
  let form: FormData;
  try {
    form = await ctx.req.formData();
  } catch {
    return no(ctx, 400, 'formulario', 'Formulario invalido.');
  }
  const archivo = form.get('zip');
  const letra = String(form.get('letra') ?? '').toUpperCase();
  if (!(archivo instanceof File) || !archivo.name.toLowerCase().endsWith('.zip')) {
    return no(ctx, 400, 'zip', 'Adjunta el paquete del problema en .zip.');
  }
  if (archivo.size > MAX_ZIP) return no(ctx, 413, 'zip', 'El paquete supera los 20 MB.');
  if (!LETRA.test(letra)) return no(ctx, 400, 'letra', 'La letra va de la A a la Z.');
  if (!(await letraLibre(ctx, cid, letra))) return no(ctx, 409, 'letra', `La letra ${letra} ya esta usada.`);
  const djId = idProblemaDJ(archivo.name.replace(/\.zip$/i, ''), cid);
  await escribirDJ(ctx.config, `/contests/${cid}/problems`, {
    cuerpo: formularioConArchivo('zip', `${djId}.zip`, new Uint8Array(await archivo.arrayBuffer()), 'application/zip'),
  });
  await enlazarConLetra(ctx, cid, djId, letra);
  await ctx.sql`
    INSERT INTO competencia_problemas (cid, dj_problem_id, letra) VALUES (${cid}, ${djId}, ${letra})
    ON CONFLICT (cid, dj_problem_id) DO UPDATE SET letra = EXCLUDED.letra
  `;
  await auditar(ctx, docenteId, 'competencia_problemas', `${cid} zip ${djId} como ${letra}`);
  return ok(ctx, { djId, letra }, 201);
};

const quitarProblema = async (ctx: Contexto, docenteId: string, cid: string, djId: string) => {
  const r = await pedirDJ(ctx.config, `/contests/${cid}/problems/${encodeURIComponent(djId)}`, { metodo: 'DELETE' });
  if (!r.ok && r.status !== 404) {
    return no(ctx, 502, 'juez', 'DOMjudge no dejo quitar el problema (puede que ya tenga envios).');
  }
  await ctx.sql.begin(async (tx) => {
    const [fila] = await tx<{ problem_id: string | null }[]>`
      DELETE FROM competencia_problemas WHERE cid = ${cid} AND dj_problem_id = ${djId} RETURNING problem_id
    `;
    if (fila?.problem_id) await liberarProblema(tx, fila.problem_id);
  });
  await auditar(ctx, docenteId, 'competencia_problemas', `${cid} quitar ${djId}`);
  return ok(ctx, { djId });
};

const liberar = async (ctx: Contexto, docenteId: string, cid: string) => {
  if (estadoDe(await concursoDJ(ctx, cid, true)) !== 'terminado') {
    return no(ctx, 409, 'en-curso', 'Los problemas se liberan cuando la competencia termina.');
  }
  const liberados = await ctx.sql.begin(async (tx) => {
    const filas = await tx<{ problem_id: string }[]>`
      UPDATE competencia_problemas SET liberado = true
      WHERE cid = ${cid} AND NOT liberado AND problem_id IS NOT NULL RETURNING problem_id
    `;
    for (const f of filas) await liberarProblema(tx, f.problem_id);
    return filas.length;
  });
  await auditar(ctx, docenteId, 'competencia_problemas', `${cid} liberar ${liberados}`);
  return ok(ctx, { liberados });
};

// ── Dirigir (durante la competencia) ──

/** Equipos de la competencia (incluidos los retirados): team_id -> nombre. */
const nombresDeEquipos = async (ctx: Contexto, cid: string) => {
  const filas = await ctx.sql<{ team_id: string; nombre: string }[]>`
    SELECT team_id, nombre FROM competencia_equipos WHERE cid = ${cid}
  `;
  return new Map(filas.map((f) => [f.team_id, f.nombre]));
};

const letrasDe = async (ctx: Contexto, cid: string) =>
  new Map((await jsonDJ<ProblemaDJ[]>(ctx.config, `/contests/${cid}/problems`)).map((p) => [p.id, p.label]));

const enviosJurado = async (ctx: Contexto, cid: string) => {
  const [lista, juicios, letras, equipos] = await Promise.all([
    jsonDJ<EnvioDJ[]>(ctx.config, `/contests/${cid}/submissions`),
    jsonDJ<JuicioDJ[]>(ctx.config, `/contests/${cid}/judgements`),
    letrasDe(ctx, cid),
    nombresDeEquipos(ctx, cid),
  ]);
  const veredictos = veredictosPorEnvio(juicios);
  return ok(ctx, {
    envios: lista.filter((e) => equipos.has(e.team_id))
      .sort((a, b) => Date.parse(b.time) - Date.parse(a.time))
      .map((e) => ({
        id: e.id,
        equipo: equipos.get(e.team_id),
        problema: letras.get(e.problem_id) ?? e.problem_id,
        lenguaje: e.language_id,
        tiempo: e.contest_time,
        veredicto: veredictos.get(e.id) ?? 'pendiente',
      })),
  });
};

const codigoEnvio = async (ctx: Contexto, cid: string, id: string) => {
  if (!/^\d+$/.test(id)) return no(ctx, 404, 'envio', 'Envio no encontrado.');
  const [envio, equipos] = await Promise.all([
    jsonDJ<EnvioDJ>(ctx.config, `/contests/${cid}/submissions/${id}`),
    nombresDeEquipos(ctx, cid),
  ]);
  if (!equipos.has(envio.team_id)) return no(ctx, 404, 'envio', 'Envio no encontrado.');
  const archivos = await jsonDJ<{ filename: string; source: string }[]>(
    ctx.config,
    `/contests/${cid}/submissions/${id}/source-code`,
  );
  const decodificar = (b64: string) => new TextDecoder().decode(Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)));
  return ok(ctx, { archivos: archivos.map((a) => ({ nombre: a.filename, codigo: decodificar(a.source) })) });
};

const aclaracionesJurado = async (ctx: Contexto, docenteId: string, cid: string) => {
  const equipos = await nombresDeEquipos(ctx, cid);
  if (ctx.req.method === 'POST') {
    const d = await cuerpoJson(ctx);
    const texto = String(d.texto ?? '').trim();
    if (!texto || texto.length > 2000) return no(ctx, 400, 'texto', 'Escribe la respuesta (hasta 2000 caracteres).');
    const equipo = typeof d.equipo === 'string' && d.equipo ? d.equipo : null;
    if (equipo && !equipos.has(equipo)) return no(ctx, 404, 'equipo', 'Equipo no encontrado.');
    const responderA = typeof d.responderA === 'string' && /^\d+$/.test(d.responderA) ? d.responderA : null;
    await escribirDJ(ctx.config, `/contests/${cid}/clarifications`, {
      tipo: 'application/json',
      cuerpo: JSON.stringify({
        text: texto,
        ...(equipo ? { to_team_id: equipo } : {}),
        ...(responderA ? { reply_to_id: responderA } : {}),
      }),
    });
    await auditar(ctx, docenteId, 'competencia_dirigir', `${cid} aclaracion ${equipo ?? 'todos'}`);
    return ok(ctx, { ok: true }, 201);
  }
  const [lista, letras] = await Promise.all([
    jsonDJ<AclaracionDJ[]>(ctx.config, `/contests/${cid}/clarifications`),
    letrasDe(ctx, cid),
  ]);
  return ok(ctx, {
    aclaraciones: lista
      .filter((a) => (a.from_team_id ? equipos.has(a.from_team_id) : true) && (a.to_team_id ? equipos.has(a.to_team_id) : true))
      .sort((a, b) => Date.parse(b.time) - Date.parse(a.time))
      .map((a) => ({
        id: a.id,
        de: a.from_team_id ? { id: a.from_team_id, nombre: equipos.get(a.from_team_id) } : null,
        para: a.to_team_id ? { id: a.to_team_id, nombre: equipos.get(a.to_team_id) } : null,
        respondeA: a.reply_to_id,
        problema: a.problem_id ? letras.get(a.problem_id) ?? null : null,
        texto: a.text,
        tiempo: a.contest_time ?? null,
      })),
  });
};

/** Globos: solo los generan los envios aceptados; el texto del equipo es "tNN: nombre". */
const globos = async (ctx: Contexto, cid: string) => {
  const [lista, problemas] = await Promise.all([
    jsonDJ<{ balloonid: number; time: string; problem: string; team: string; done: boolean }[]>(
      ctx.config,
      `/contests/${cid}/balloons`,
    ),
    jsonDJ<ProblemaDJ[]>(ctx.config, `/contests/${cid}/problems`),
  ]);
  const color = new Map(problemas.map((p) => [p.label, p.rgb ?? null]));
  return ok(ctx, {
    globos: lista.map((b) => ({
      id: b.balloonid,
      problema: b.problem,
      color: color.get(b.problem) ?? null,
      equipo: b.team.replace(/^t\d+:\s*/, ''),
      tiempo: b.time,
      hecho: b.done,
    })).sort((a, b) => Number(a.hecho) - Number(b.hecho)),
  });
};

const marcarGlobo = async (ctx: Contexto, docenteId: string, cid: string, id: string) => {
  if (!/^\d+$/.test(id)) return no(ctx, 404, 'globo', 'Globo no encontrado.');
  const r = await pedirDJ(ctx.config, `/contests/${cid}/balloons/${id}/done`, { metodo: 'POST' });
  if (!r.ok) return no(ctx, 502, 'juez', 'DOMjudge no marco el globo.');
  await auditar(ctx, docenteId, 'competencia_dirigir', `${cid} globo ${id}`);
  return ok(ctx, { id });
};

/** Marcador del jurado: sin congelar (la cuenta de servicio ve el completo). */
const marcadorJurado = async (ctx: Contexto, cid: string) => {
  const [tabla, equipos, problemas] = await Promise.all([
    jsonDJ<{ rows: FilaMarcadorDJ[]; state?: { frozen?: string | null; thawed?: string | null } }>(
      ctx.config,
      `/contests/${cid}/scoreboard`,
    ),
    equiposDelConcurso(ctx.sql, cid),
    jsonDJ<ProblemaDJ[]>(ctx.config, `/contests/${cid}/problems`),
  ]);
  const ordenados = [...problemas].sort((a, b) => a.label.localeCompare(b.label));
  return ok(ctx, {
    congelado: Boolean(tabla.state?.frozen && !tabla.state?.thawed),
    letras: ordenados.map((p) => p.label),
    filas: filasMarcador(tabla.rows, equipos, new Map(ordenados.map((p) => [p.id, p.label])), null),
  });
};

const descongelar = async (ctx: Contexto, docenteId: string, cid: string) => {
  if (estadoDe(await concursoDJ(ctx, cid, true)) !== 'terminado') {
    return no(ctx, 409, 'en-curso', 'El marcador se descongela cuando la competencia termina.');
  }
  await escribirDJ(ctx.config, `/contests/${cid}`, {
    metodo: 'PATCH',
    tipo: 'application/json',
    cuerpo: JSON.stringify({ id: cid, scoreboard_thaw_time: isoBogota(new Date()) }),
  });
  await auditar(ctx, docenteId, 'competencia_dirigir', `${cid} descongelar`);
  return ok(ctx, { cid });
};

/** /jurado/... Despacho por segmentos; todo exige docente. */
export const jurado = async (ctx: Contexto, s: string[]): Promise<Response> => {
  if (!ctx.identidad) return no(ctx, 401, 'sin-sesion', 'Inicia sesion para continuar.');
  if (!esDocente(ctx.identidad, ctx.config.docentes)) {
    return no(ctx, 403, 'rol', 'Esta vista es solo para el jurado.');
  }
  if (!ctx.config.domjudgeUsuario || !ctx.config.domjudgeClave) {
    return no(ctx, 503, 'sin-juez', 'Las competencias no estan configuradas.');
  }
  const m = ctx.req.method;
  const [recurso, cid, sub, id, sub2, id2] = s;
  try {
    const docenteId = await docenteDe(ctx);
    if (recurso === 'estudiantes' && m === 'GET' && !cid) return await buscarEstudiantes(ctx);
    if (recurso === 'banco' && m === 'GET' && !cid) return await buscarBanco(ctx);
    if (recurso !== 'competencias') return no(ctx, 404, 'ruta', 'Ruta no encontrada.');
    if (!cid) {
      if (m === 'GET') return await listar(ctx);
      if (m === 'POST') return await crear(ctx, docenteId);
      return no(ctx, 405, 'metodo', 'Metodo no permitido.');
    }
    if (!CID.test(cid)) return no(ctx, 404, 'competencia', 'Competencia no encontrada.');
    const [existe] = await ctx.sql`SELECT 1 FROM competencias WHERE cid = ${cid}`;
    if (!existe) return no(ctx, 404, 'competencia', 'Competencia no encontrada.');

    if (!sub && m === 'GET') return await detalle(ctx, cid);
    if (sub === 'inicio' && m === 'POST') return await cambiarInicio(ctx, docenteId, cid);
    if (sub === 'archivar' && m === 'POST') return await archivar(ctx, docenteId, cid);
    if (sub === 'liberar' && m === 'POST') return await liberar(ctx, docenteId, cid);
    if (sub === 'envios' && m === 'GET') {
      return id && sub2 === 'codigo' ? await codigoEnvio(ctx, cid, id) : await enviosJurado(ctx, cid);
    }
    if (sub === 'aclaraciones' && (m === 'GET' || m === 'POST')) return await aclaracionesJurado(ctx, docenteId, cid);
    if (sub === 'globos' && !id && m === 'GET') return await globos(ctx, cid);
    if (sub === 'globos' && id && m === 'POST') return await marcarGlobo(ctx, docenteId, cid, id);
    if (sub === 'marcador' && m === 'GET') return await marcadorJurado(ctx, cid);
    if (sub === 'descongelar' && m === 'POST') return await descongelar(ctx, docenteId, cid);
    if (sub === 'equipos') {
      if (!id && m === 'POST') return await crearEquipo(ctx, docenteId, cid);
      if (id && !sub2 && m === 'POST') return await editarEquipo(ctx, docenteId, cid, id);
      if (id && sub2 === 'clave' && m === 'POST') return await nuevaClave(ctx, docenteId, cid, id);
      if (id && sub2 === 'miembros' && !id2 && m === 'POST') return await agregarMiembro(ctx, docenteId, cid, id);
      if (id && sub2 === 'miembros' && id2 && m === 'DELETE') return await quitarMiembro(ctx, docenteId, cid, id, id2);
    }
    if (sub === 'problemas') {
      if (id === 'banco' && m === 'POST') return await agregarDelBanco(ctx, docenteId, cid);
      if (id === 'zip' && m === 'POST') return await subirZip(ctx, docenteId, cid);
      if (id && m === 'DELETE') return await quitarProblema(ctx, docenteId, cid, id);
    }
    return no(ctx, 404, 'ruta', 'Ruta no encontrada.');
  } catch (error) {
    if (error instanceof ErrorDJ) {
      console.error('Jurado, DOMjudge:', error.status, error.message);
      return no(ctx, 502, 'juez', `DOMjudge: ${error.message}`);
    }
    console.error('Jurado:', error);
    return no(ctx, 500, 'jurado', 'No se pudo completar la accion del jurado.');
  }
};
