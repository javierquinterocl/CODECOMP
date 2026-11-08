import type { Contexto } from '../contexto.ts';
import { rechazo, responder } from '../http.ts';
import {
  ARCHIVO_POR_LENGUAJE,
  type ConcursoDJ,
  elegirConcurso,
  type EnvioDJ,
  estadoDe,
  jsonDJ,
  type JuicioDJ,
  pedirDJ,
  type ProblemaDJ,
  segundosDe,
  type UsuarioDJ,
  usuarioDeCorreo,
  veredictosPorEnvio,
} from '../domjudge.ts';

// Cache corta por instancia: la lista de usuarios y concursos cambia poco durante un evento.
const CACHE_MS = 30_000;
const cache = new Map<string, { hasta: number; valor: unknown }>();
const enCache = async <T>(llave: string, cargar: () => Promise<T>): Promise<T> => {
  const hit = cache.get(llave);
  if (hit && hit.hasta > Date.now()) return hit.valor as T;
  const valor = await cargar();
  cache.set(llave, { hasta: Date.now() + CACHE_MS, valor });
  return valor;
};

const concursoActual = (ctx: Contexto) =>
  enCache('concursos', () => jsonDJ<ConcursoDJ[]>(ctx.config, '/contests'))
    .then((lista) => elegirConcurso(lista));

const equipoDe = async (ctx: Contexto): Promise<UsuarioDJ | null> => {
  const usuarios = await enCache('usuarios', () => jsonDJ<UsuarioDJ[]>(ctx.config, '/users'));
  return usuarioDeCorreo(usuarios, ctx.identidad?.email ?? null);
};

const problemasDe = (ctx: Contexto, cid: string) =>
  enCache(`problemas:${cid}`, () => jsonDJ<ProblemaDJ[]>(ctx.config, `/contests/${cid}/problems`))
    .then((p) => [...p].sort((a, b) => (a.ordinal ?? 0) - (b.ordinal ?? 0)));

const nombreEquipo = async (ctx: Contexto, cid: string, teamId: string): Promise<string> => {
  const equipos = await enCache(
    `equipos:${cid}`,
    () => jsonDJ<{ id: string; name: string; display_name?: string }[]>(ctx.config, `/contests/${cid}/teams`),
  );
  const e = equipos.find((t) => t.id === teamId);
  return e?.display_name || e?.name || teamId;
};

/** GET /competencias: concurso, equipo del estudiante y, si ya empezo, los problemas. */
const resumen = async (ctx: Contexto): Promise<Response> => {
  const c = await concursoActual(ctx);
  if (!c) return responder({ status: 200, cuerpo: { concurso: null } }, ctx.cors);
  const estado = estadoDe(c);
  const usuario = await equipoDe(ctx);
  const [problemas, lenguajes] = await Promise.all([
    estado === 'antes' ? Promise.resolve([]) : problemasDe(ctx, c.id),
    enCache(`lenguajes:${c.id}`, () => jsonDJ<{ id: string; name: string }[]>(ctx.config, `/contests/${c.id}/languages`)),
  ]);
  return responder({
    status: 200,
    cuerpo: {
      concurso: {
        id: c.id,
        nombre: c.formal_name || c.name,
        inicio: c.start_time,
        fin: c.end_time,
        congeladoSegundos: segundosDe(c.scoreboard_freeze_duration),
        estado,
      },
      equipo: usuario?.team_id
        ? { id: usuario.team_id, nombre: await nombreEquipo(ctx, c.id, usuario.team_id) }
        : null,
      problemas: problemas.map((p) => ({
        id: p.id,
        letra: p.label,
        nombre: p.name,
        limiteSegundos: p.time_limit ?? null,
        color: p.rgb ?? null,
      })),
      lenguajes: lenguajes
        .filter((l) => ARCHIVO_POR_LENGUAJE[l.id])
        .map((l) => ({ id: l.id, nombre: l.name })),
      servidor: Date.now(),
    },
  }, ctx.cors);
};

/** GET /competencias/enunciado/:id: el PDF, solo a equipos inscritos y con el concurso empezado. */
const enunciado = async (ctx: Contexto, problemaId: string | undefined): Promise<Response> => {
  const c = await concursoActual(ctx);
  if (!c || estadoDe(c) === 'antes') {
    return responder(rechazo(403, 'antes', 'El concurso todavia no empieza.'), ctx.cors);
  }
  if (!(await equipoDe(ctx))) {
    return responder(rechazo(403, 'sin-equipo', 'No estas inscrito en esta competencia.'), ctx.cors);
  }
  const problemas = await problemasDe(ctx, c.id);
  const p = problemas.find((x) => x.id === problemaId);
  if (!p) return responder(rechazo(404, 'problema', 'Problema no encontrado.'), ctx.cors);
  const r = await pedirDJ(ctx.config, `/contests/${c.id}/problems/${encodeURIComponent(p.id)}/statement`);
  if (!r.ok) return responder(rechazo(404, 'enunciado', 'Este problema no tiene enunciado.'), ctx.cors);
  const cabeceras = new Headers(ctx.cors);
  cabeceras.set('Content-Type', 'application/pdf');
  cabeceras.set('Content-Disposition', `inline; filename="${p.label}.pdf"`);
  cabeceras.set('Cache-Control', 'private, max-age=300');
  return new Response(r.body, { status: 200, headers: cabeceras });
};

/** POST /competencias/envio { problema, lenguaje, codigo }: envia a nombre del equipo. */
const enviar = async (ctx: Contexto): Promise<Response> => {
  let datos: { problema?: string; lenguaje?: string; codigo?: string };
  try {
    datos = await ctx.req.json();
  } catch {
    return responder(rechazo(400, 'json', 'Cuerpo invalido.'), ctx.cors);
  }
  const { problema, lenguaje, codigo } = datos;
  if (typeof codigo !== 'string' || !codigo.trim()) {
    return responder(rechazo(400, 'codigo', 'Escribe tu solucion antes de enviar.'), ctx.cors);
  }
  if (new TextEncoder().encode(codigo).length > ctx.config.maxCodigoBytes) {
    return responder(rechazo(413, 'codigo', 'El codigo es demasiado largo.'), ctx.cors);
  }
  const archivo = ARCHIVO_POR_LENGUAJE[lenguaje ?? ''];
  if (!archivo) return responder(rechazo(400, 'lenguaje', 'Lenguaje no permitido.'), ctx.cors);

  const c = await concursoActual(ctx);
  if (!c || estadoDe(c) !== 'en-curso') {
    return responder(rechazo(403, 'cerrado', 'El concurso no esta en curso.'), ctx.cors);
  }
  const usuario = await equipoDe(ctx);
  if (!usuario?.team_id) {
    return responder(rechazo(403, 'sin-equipo', 'No estas inscrito en esta competencia.'), ctx.cors);
  }
  const problemas = await problemasDe(ctx, c.id);
  if (!problemas.some((p) => p.id === problema)) {
    return responder(rechazo(404, 'problema', 'Problema no encontrado.'), ctx.cors);
  }

  const form = new FormData();
  form.append('problem_id', problema as string);
  form.append('language_id', lenguaje as string);
  form.append('team_id', usuario.team_id);
  form.append('user_id', usuario.id);
  form.append('code[]', new Blob([codigo], { type: 'text/plain' }), archivo);
  const r = await pedirDJ(ctx.config, `/contests/${c.id}/submissions`, { metodo: 'POST', cuerpo: form });
  if (!r.ok) {
    console.error('DOMjudge rechazo el envio:', r.status, (await r.text()).slice(0, 300));
    return responder(rechazo(502, 'juez', 'El juez no recibio el envio. Intenta de nuevo.'), ctx.cors);
  }
  const envio = await r.json() as { id: string };
  return responder({ status: 201, cuerpo: { id: envio.id } }, ctx.cors);
};

/** GET /competencias/envios: solo los del equipo del estudiante, con su veredicto. */
const envios = async (ctx: Contexto): Promise<Response> => {
  const c = await concursoActual(ctx);
  const usuario = await equipoDe(ctx);
  if (!c || !usuario?.team_id) return responder({ status: 200, cuerpo: { envios: [] } }, ctx.cors);
  const equipo = usuario.team_id;
  const [lista, juicios, problemas] = await Promise.all([
    jsonDJ<EnvioDJ[]>(ctx.config, `/contests/${c.id}/submissions?team_id=${encodeURIComponent(equipo)}`),
    jsonDJ<JuicioDJ[]>(ctx.config, `/contests/${c.id}/judgements`),
    problemasDe(ctx, c.id),
  ]);
  const propios = lista.filter((e) => e.team_id === equipo);
  const ids = new Set(propios.map((e) => e.id));
  const veredictos = veredictosPorEnvio(juicios.filter((j) => ids.has(j.submission_id)));
  const letra = new Map(problemas.map((p) => [p.id, p.label]));
  return responder({
    status: 200,
    cuerpo: {
      envios: propios
        .sort((a, b) => Date.parse(b.time) - Date.parse(a.time))
        .map((e) => ({
          id: e.id,
          problema: letra.get(e.problem_id) ?? e.problem_id,
          lenguaje: e.language_id,
          tiempo: e.contest_time,
          veredicto: veredictos.get(e.id) ?? 'pendiente',
        })),
    },
  }, ctx.cors);
};

/** GET /competencias/marcador: el publico de DOMjudge (respeta el congelado), sin cuenta. */
const marcador = async (ctx: Contexto): Promise<Response> => {
  const c = await concursoActual(ctx);
  if (!c || estadoDe(c) === 'antes') return responder({ status: 200, cuerpo: { filas: [] } }, ctx.cors);
  const [tabla, equipos, problemas] = await Promise.all([
    jsonDJ<{
      rows: {
        rank: number;
        team_id: string;
        score: { num_solved: number; total_time: number };
        problems: { problem_id: string; num_judged: number; num_pending: number; solved: boolean; first_to_solve?: boolean; time?: number }[];
      }[];
      state?: { frozen?: string | null; thawed?: string | null };
    }>(ctx.config, `/contests/${c.id}/scoreboard`, false),
    jsonDJ<{ id: string; name: string; display_name?: string }[]>(ctx.config, `/contests/${c.id}/teams`, false),
    problemasDe(ctx, c.id),
  ]);
  const nombre = new Map(equipos.map((t) => [t.id, t.display_name || t.name]));
  const letra = new Map(problemas.map((p) => [p.id, p.label]));
  const propio = (await equipoDe(ctx))?.team_id ?? null;
  return responder({
    status: 200,
    cuerpo: {
      congelado: Boolean(tabla.state?.frozen && !tabla.state?.thawed),
      letras: problemas.map((p) => p.label),
      filas: tabla.rows.map((f) => ({
        puesto: f.rank,
        equipo: nombre.get(f.team_id) ?? f.team_id,
        propio: f.team_id === propio,
        resueltos: f.score.num_solved,
        tiempo: f.score.total_time,
        problemas: f.problems.map((p) => ({
          letra: letra.get(p.problem_id) ?? p.problem_id,
          resuelto: p.solved,
          primero: Boolean(p.first_to_solve),
          intentos: p.num_judged + p.num_pending,
          pendientes: p.num_pending,
          minuto: p.time ?? null,
        })),
      })),
    },
  }, ctx.cors);
};

/** /competencias[/recurso[/id]]. Todo exige sesion de CODECOMP. */
export const competencias = async (
  ctx: Contexto,
  recurso?: string,
  id?: string,
): Promise<Response> => {
  if (!ctx.identidad) return responder(rechazo(401, 'auth', 'Inicia sesion.'), ctx.cors);
  if (!ctx.config.domjudgeUsuario || !ctx.config.domjudgeClave) {
    return responder(rechazo(503, 'sin-juez', 'Las competencias no estan configuradas.'), ctx.cors);
  }
  const metodo = ctx.req.method;
  try {
    if (!recurso && metodo === 'GET') return await resumen(ctx);
    if (recurso === 'enunciado' && metodo === 'GET') return await enunciado(ctx, id);
    if (recurso === 'envio' && metodo === 'POST') return await enviar(ctx);
    if (recurso === 'envios' && metodo === 'GET') return await envios(ctx);
    if (recurso === 'marcador' && metodo === 'GET') return await marcador(ctx);
  } catch (error) {
    console.error('Competencias:', error);
    return responder(rechazo(502, 'juez', 'El juez no responde. Intenta en unos segundos.'), ctx.cors);
  }
  return responder(rechazo(404, 'ruta', 'Ruta no encontrada.'), ctx.cors);
};
