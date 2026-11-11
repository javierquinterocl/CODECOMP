// Competencias del estudiante: su equipo sale de Postgres (lo arma el jurado) y DOMjudge juzga.
import type { Contexto } from '../contexto.ts';
import { rechazo, responder } from '../http.ts';
import { idDeUsuario } from '../usuarios.ts';
import { type EquipoDeEstudiante, equiposDelConcurso, equiposDelEstudiante } from '../competencias.ts';
import {
  type AclaracionDJ,
  aclaracionesDeEquipo,
  ARCHIVO_POR_LENGUAJE,
  type ConcursoDJ,
  elegirConcurso,
  type EnvioDJ,
  ErrorDJ,
  escribirDJ,
  estadoDe,
  type FilaMarcadorDJ,
  filasMarcador,
  jsonDJ,
  type JuicioDJ,
  pedirDJ,
  type ProblemaDJ,
  segundosDe,
  veredictosPorEnvio,
} from '../domjudge.ts';

// Cache corta por instancia: concursos y problemas cambian poco durante un evento.
const CACHE_MS = 15_000;
const cache = new Map<string, { hasta: number; valor: unknown }>();
const enCache = async <T>(llave: string, cargar: () => Promise<T>): Promise<T> => {
  const hit = cache.get(llave);
  if (hit && hit.hasta > Date.now()) return hit.valor as T;
  const valor = await cargar();
  cache.set(llave, { hasta: Date.now() + CACHE_MS, valor });
  return valor;
};

const no = (ctx: Contexto, status: number, codigo: string, mensaje: string) =>
  responder(rechazo(status, codigo, mensaje), ctx.cors);

interface Inscripcion {
  concurso: ConcursoDJ;
  equipo: EquipoDeEstudiante;
}

/** El concurso del estudiante: entre los de sus equipos, el en curso, si no el proximo o el ultimo. */
const inscripcionDe = async (ctx: Contexto): Promise<Inscripcion | null> => {
  const userId = await idDeUsuario(ctx.sql, ctx.identidad!);
  const equipos = await equiposDelEstudiante(ctx.sql, userId);
  if (!equipos.length) return null;
  const concursos = await enCache('concursos', () => jsonDJ<ConcursoDJ[]>(ctx.config, '/contests'));
  const concurso = elegirConcurso(concursos.filter((c) => equipos.some((e) => e.cid === c.id)));
  if (!concurso) return null;
  return { concurso, equipo: equipos.find((e) => e.cid === concurso.id)! };
};

const problemasDe = (ctx: Contexto, cid: string) =>
  enCache(`problemas:${cid}`, () => jsonDJ<ProblemaDJ[]>(ctx.config, `/contests/${cid}/problems`))
    .then((p) => [...p].sort((a, b) => a.label.localeCompare(b.label)));

const delBanco = async (ctx: Contexto, cid: string) => {
  const filas = await ctx.sql<{ dj_problem_id: string }[]>`
    SELECT dj_problem_id FROM competencia_problemas WHERE cid = ${cid} AND problem_id IS NOT NULL
  `;
  return new Set(filas.map((f) => f.dj_problem_id));
};

/** GET /competencias: concurso, equipo y, si ya empezo, los problemas. */
const resumen = async (ctx: Contexto): Promise<Response> => {
  const ins = await inscripcionDe(ctx);
  if (!ins) return responder({ status: 200, cuerpo: { concurso: null } }, ctx.cors);
  const { concurso: c, equipo } = ins;
  const estado = estadoDe(c);
  const [problemas, lenguajes, banco] = await Promise.all([
    estado === 'antes' ? Promise.resolve([]) : problemasDe(ctx, c.id),
    enCache(`lenguajes:${c.id}`, () => jsonDJ<{ id: string; name: string }[]>(ctx.config, `/contests/${c.id}/languages`)),
    delBanco(ctx, c.id),
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
      equipo: { id: equipo.team_id, nombre: equipo.nombre, retirado: equipo.retirado },
      problemas: problemas.map((p) => ({
        id: p.id,
        letra: p.label,
        nombre: p.name,
        limiteSegundos: p.time_limit ?? null,
        banco: banco.has(p.id),
      })),
      lenguajes: lenguajes
        .filter((l) => ARCHIVO_POR_LENGUAJE[l.id])
        .map((l) => ({ id: l.id, nombre: l.name })),
      servidor: Date.now(),
    },
  }, ctx.cors);
};

/** Concurso empezado y problema del concurso; si no, la respuesta de rechazo. */
const problemaVisible = async (ctx: Contexto, problemaId: string | undefined) => {
  const ins = await inscripcionDe(ctx);
  if (!ins) return { error: no(ctx, 403, 'sin-equipo', 'No estas inscrito en esta competencia.') };
  if (estadoDe(ins.concurso) === 'antes') return { error: no(ctx, 403, 'antes', 'El concurso todavia no empieza.') };
  const p = (await problemasDe(ctx, ins.concurso.id)).find((x) => x.id === problemaId);
  if (!p) return { error: no(ctx, 404, 'problema', 'Problema no encontrado.') };
  return { ins, p };
};

/** GET /competencias/enunciado/:id: el PDF de un paquete subido a mano. */
const enunciado = async (ctx: Contexto, problemaId: string | undefined): Promise<Response> => {
  const v = await problemaVisible(ctx, problemaId);
  if (v.error) return v.error;
  const r = await pedirDJ(ctx.config, `/contests/${v.ins.concurso.id}/problems/${encodeURIComponent(v.p.id)}/statement`);
  if (!r.ok) return no(ctx, 404, 'enunciado', 'Este problema no tiene enunciado en PDF.');
  const cabeceras = new Headers(ctx.cors);
  cabeceras.set('Content-Type', 'application/pdf');
  cabeceras.set('Content-Disposition', `inline; filename="${v.p.label}.pdf"`);
  cabeceras.set('Cache-Control', 'private, max-age=300');
  return new Response(r.body, { status: 200, headers: cabeceras });
};

/** GET /competencias/problema/:id: enunciado de un problema del banco, con la forma de /problems. */
const problemaDelBanco = async (ctx: Contexto, problemaId: string | undefined): Promise<Response> => {
  const v = await problemaVisible(ctx, problemaId);
  if (v.error) return v.error;
  const [fila] = await ctx.sql`
    SELECT p.id, p.problem_number, p.title, p.title_es, p.description_markdown,
      p.description_markdown_es, p.time_limit_sec, p.memory_limit_mb, p.difficulty_rating
    FROM competencia_problemas cp JOIN problems p ON p.id = cp.problem_id
    WHERE cp.cid = ${v.ins.concurso.id} AND cp.dj_problem_id = ${v.p.id}
  `;
  if (!fila) return no(ctx, 404, 'problema', 'Este problema no viene del banco.');
  const ejemplos = await ctx.sql`
    SELECT input, expected_output AS output FROM test_cases
    WHERE problem_id = ${fila.id} AND NOT is_hidden ORDER BY id
  `;
  const { id: _id, ...problema } = fila;
  return responder({ status: 200, cuerpo: { problem: { ...problema, examples: ejemplos } } }, ctx.cors);
};

/** POST /competencias/envio { problema, lenguaje, codigo }: envia a nombre del equipo. */
const enviar = async (ctx: Contexto): Promise<Response> => {
  let datos: { problema?: string; lenguaje?: string; codigo?: string };
  try {
    datos = await ctx.req.json();
  } catch {
    return no(ctx, 400, 'json', 'Cuerpo invalido.');
  }
  const { problema, lenguaje, codigo } = datos;
  if (typeof codigo !== 'string' || !codigo.trim()) return no(ctx, 400, 'codigo', 'Escribe tu solucion antes de enviar.');
  if (new TextEncoder().encode(codigo).length > ctx.config.maxCodigoBytes) {
    return no(ctx, 413, 'codigo', 'El codigo es demasiado largo.');
  }
  const archivo = ARCHIVO_POR_LENGUAJE[lenguaje ?? ''];
  if (!archivo) return no(ctx, 400, 'lenguaje', 'Lenguaje no permitido.');

  const ins = await inscripcionDe(ctx);
  if (!ins) return no(ctx, 403, 'sin-equipo', 'No estas inscrito en esta competencia.');
  if (ins.equipo.retirado) return no(ctx, 403, 'retirado', 'Tu equipo fue retirado de esta competencia.');
  // Con la cuenta de servicio DOMjudge no revisa el horario: lo revisa CODECOMP.
  if (estadoDe(ins.concurso) !== 'en-curso') return no(ctx, 403, 'cerrado', 'El concurso no esta en curso.');
  const cid = ins.concurso.id;
  if (!(await problemasDe(ctx, cid)).some((p) => p.id === problema)) {
    return no(ctx, 404, 'problema', 'Problema no encontrado.');
  }

  const form = new FormData();
  form.append('problem_id', problema as string);
  form.append('language_id', lenguaje as string);
  form.append('team_id', ins.equipo.team_id);
  // La cuenta de respaldo del equipo tiene el mismo id que el equipo.
  form.append('user_id', ins.equipo.team_id);
  form.append('code[]', new Blob([codigo], { type: 'text/plain' }), archivo);
  const r = await pedirDJ(ctx.config, `/contests/${cid}/submissions`, { metodo: 'POST', cuerpo: form });
  if (!r.ok) {
    console.error('DOMjudge rechazo el envio:', r.status, (await r.text()).slice(0, 300));
    return no(ctx, 502, 'juez', 'El juez no recibio el envio. Intenta de nuevo.');
  }
  const envio = await r.json() as { id: string };
  return responder({ status: 201, cuerpo: { id: envio.id } }, ctx.cors);
};

/** GET /competencias/envios: solo los del equipo del estudiante, con su veredicto. */
const envios = async (ctx: Contexto): Promise<Response> => {
  const ins = await inscripcionDe(ctx);
  if (!ins) return responder({ status: 200, cuerpo: { envios: [] } }, ctx.cors);
  const cid = ins.concurso.id;
  const equipo = ins.equipo.team_id;
  const [lista, juicios, problemas] = await Promise.all([
    jsonDJ<EnvioDJ[]>(ctx.config, `/contests/${cid}/submissions?team_id=${encodeURIComponent(equipo)}`),
    jsonDJ<JuicioDJ[]>(ctx.config, `/contests/${cid}/judgements`),
    problemasDe(ctx, cid),
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

/** GET /competencias/marcador: el publico de DOMjudge (respeta el congelado), solo equipos del concurso. */
const marcador = async (ctx: Contexto): Promise<Response> => {
  const ins = await inscripcionDe(ctx);
  if (!ins || estadoDe(ins.concurso) === 'antes') return responder({ status: 200, cuerpo: { filas: [] } }, ctx.cors);
  const cid = ins.concurso.id;
  const [tabla, equipos, problemas] = await Promise.all([
    jsonDJ<{ rows: FilaMarcadorDJ[]; state?: { frozen?: string | null; thawed?: string | null } }>(
      ctx.config,
      `/contests/${cid}/scoreboard?public=true`,
      false,
    ),
    equiposDelConcurso(ctx.sql, cid),
    problemasDe(ctx, cid),
  ]);
  return responder({
    status: 200,
    cuerpo: {
      congelado: Boolean(tabla.state?.frozen && !tabla.state?.thawed),
      letras: problemas.map((p) => p.label),
      filas: filasMarcador(tabla.rows, equipos, new Map(problemas.map((p) => [p.id, p.label])), ins.equipo.team_id),
    },
  }, ctx.cors);
};

/** GET/POST /competencias/aclaraciones: las del equipo y los avisos generales; preguntar al jurado. */
const aclaraciones = async (ctx: Contexto): Promise<Response> => {
  const ins = await inscripcionDe(ctx);
  if (!ins) return no(ctx, 403, 'sin-equipo', 'No estas inscrito en esta competencia.');
  const cid = ins.concurso.id;
  const equipo = ins.equipo.team_id;
  const problemas = await problemasDe(ctx, cid);
  if (ctx.req.method === 'POST') {
    if (estadoDe(ins.concurso) !== 'en-curso') return no(ctx, 403, 'cerrado', 'El concurso no esta en curso.');
    const d = await ctx.req.json().catch(() => ({})) as { texto?: string; problema?: string };
    const texto = String(d.texto ?? '').trim();
    if (!texto || texto.length > 1000) return no(ctx, 400, 'texto', 'Escribe tu pregunta (hasta 1000 caracteres).');
    if (d.problema && !problemas.some((p) => p.id === d.problema)) return no(ctx, 404, 'problema', 'Problema no encontrado.');
    await escribirDJ(ctx.config, `/contests/${cid}/clarifications`, {
      tipo: 'application/json',
      cuerpo: JSON.stringify({ text: texto, from_team_id: equipo, ...(d.problema ? { problem_id: d.problema } : {}) }),
    });
    return responder({ status: 201, cuerpo: { ok: true } }, ctx.cors);
  }
  const lista = await jsonDJ<AclaracionDJ[]>(ctx.config, `/contests/${cid}/clarifications`);
  const letra = new Map(problemas.map((p) => [p.id, p.label]));
  return responder({
    status: 200,
    cuerpo: {
      aclaraciones: aclaracionesDeEquipo(lista, equipo)
        .sort((a, b) => Date.parse(b.time) - Date.parse(a.time))
        .map((a) => ({
          id: a.id,
          propia: a.from_team_id === equipo,
          general: a.from_team_id === null && a.to_team_id === null,
          respondeA: a.reply_to_id,
          problema: a.problem_id ? letra.get(a.problem_id) ?? null : null,
          texto: a.text,
          tiempo: a.contest_time ?? null,
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
  if (!ctx.identidad) return no(ctx, 401, 'auth', 'Inicia sesion.');
  if (!ctx.config.domjudgeUsuario || !ctx.config.domjudgeClave) {
    return no(ctx, 503, 'sin-juez', 'Las competencias no estan configuradas.');
  }
  const metodo = ctx.req.method;
  try {
    if (!recurso && metodo === 'GET') return await resumen(ctx);
    if (recurso === 'enunciado' && metodo === 'GET') return await enunciado(ctx, id);
    if (recurso === 'problema' && metodo === 'GET') return await problemaDelBanco(ctx, id);
    if (recurso === 'envio' && metodo === 'POST') return await enviar(ctx);
    if (recurso === 'envios' && metodo === 'GET') return await envios(ctx);
    if (recurso === 'marcador' && metodo === 'GET') return await marcador(ctx);
    if (recurso === 'aclaraciones' && (metodo === 'GET' || metodo === 'POST')) return await aclaraciones(ctx);
  } catch (error) {
    console.error('Competencias:', error instanceof ErrorDJ ? `${error.status} ${error.message}` : error);
    return no(ctx, 502, 'juez', 'El juez no responde. Intenta en unos segundos.');
  }
  return no(ctx, 404, 'ruta', 'Ruta no encontrada.');
};
