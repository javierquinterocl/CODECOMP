import { strToU8, zipSync } from 'npm:fflate@0.8.2';
import type { Config } from './config.ts';

// Formas minimas de la API v4 de DOMjudge que usa CODECOMP.
export interface ConcursoDJ {
  id: string;
  name: string;
  formal_name?: string;
  start_time: string | null;
  end_time: string | null;
  scoreboard_freeze_duration?: string | null;
}
export interface ProblemaDJ {
  id: string;
  label: string;
  name: string;
  time_limit?: number;
  rgb?: string;
  ordinal?: number;
}
export interface EnvioDJ {
  id: string;
  problem_id: string;
  language_id: string;
  team_id: string;
  time: string;
  contest_time: string;
}
export interface JuicioDJ {
  id: string;
  submission_id: string;
  judgement_type_id: string | null;
  valid?: boolean;
}

export const ARCHIVO_POR_LENGUAJE: Record<string, string> = {
  c: 'main.c',
  cpp: 'main.cpp',
  java: 'Main.java',
  python3: 'main.py',
};

const ms = (iso: string | null | undefined): number => (iso ? Date.parse(iso) : NaN);

/** El concurso en curso; si no hay, el proximo; si no, el ultimo que termino. */
export const elegirConcurso = (
  concursos: ConcursoDJ[],
  ahora: number = Date.now(),
): ConcursoDJ | null => {
  const conFechas = concursos.filter((c) => !isNaN(ms(c.start_time)) && !isNaN(ms(c.end_time)));
  const enCurso = conFechas.filter((c) => ms(c.start_time) <= ahora && ahora < ms(c.end_time));
  if (enCurso.length) return enCurso.sort((a, b) => ms(b.start_time) - ms(a.start_time))[0];
  const proximos = conFechas.filter((c) => ms(c.start_time) > ahora);
  if (proximos.length) return proximos.sort((a, b) => ms(a.start_time) - ms(b.start_time))[0];
  const pasados = conFechas.filter((c) => ms(c.end_time) <= ahora);
  return pasados.sort((a, b) => ms(b.end_time) - ms(a.end_time))[0] ?? null;
};

export type EstadoConcurso = 'antes' | 'en-curso' | 'terminado';

export const estadoDe = (c: ConcursoDJ, ahora: number = Date.now()): EstadoConcurso =>
  ahora < ms(c.start_time) ? 'antes' : ahora < ms(c.end_time) ? 'en-curso' : 'terminado';

/** "1:00:00.000" -> segundos. */
export const segundosDe = (duracion: string | null | undefined): number => {
  if (!duracion) return 0;
  const [h, m, s] = duracion.replace(/^-/, '').split(':').map(Number);
  return (h || 0) * 3600 + (m || 0) * 60 + Math.floor(s || 0);
};


/** Ultimo juicio valido de cada envio; sin juicio = pendiente. */
export const veredictosPorEnvio = (juicios: JuicioDJ[]): Map<string, string> => {
  const ultimos = new Map<string, JuicioDJ>();
  for (const j of juicios) {
    if (j.valid === false) continue;
    const previo = ultimos.get(j.submission_id);
    if (!previo || Number(j.id) > Number(previo.id)) ultimos.set(j.submission_id, j);
  }
  const salida = new Map<string, string>();
  for (const [envio, j] of ultimos) salida.set(envio, j.judgement_type_id ?? 'pendiente');
  return salida;
};

/** Cliente de la API v4. `conCuenta` usa la cuenta de servicio; sin ella, lo publico. */
export const pedirDJ = async (
  config: Config,
  ruta: string,
  { conCuenta = true, metodo = 'GET', cuerpo, tipo }: {
    conCuenta?: boolean;
    metodo?: string;
    cuerpo?: BodyInit;
    tipo?: string;
  } = {},
): Promise<Response> => {
  const cabeceras = new Headers({ Accept: 'application/json' });
  if (tipo) cabeceras.set('Content-Type', tipo);
  if (conCuenta) {
    cabeceras.set('Authorization', 'Basic ' + btoa(`${config.domjudgeUsuario}:${config.domjudgeClave}`));
  }
  return await fetch(`${config.domjudgeUrl}/api/v4${ruta}`, {
    method: metodo,
    headers: cabeceras,
    body: cuerpo,
    signal: AbortSignal.timeout(config.domjudgeTimeoutMs),
  });
};

export const jsonDJ = async <T>(config: Config, ruta: string, conCuenta = true): Promise<T> => {
  const r = await pedirDJ(config, ruta, { conCuenta });
  if (!r.ok) throw new Error(`DOMjudge ${r.status} en ${ruta}`);
  return await r.json() as T;
};

/** Error de DOMjudge con su mensaje, para mostrarlo al jurado. */
export class ErrorDJ extends Error {
  constructor(public status: number, mensaje: string) {
    super(mensaje);
  }
}

/** Escribe en DOMjudge y devuelve el JSON; si falla, lanza ErrorDJ con el mensaje del juez. */
export const escribirDJ = async <T = unknown>(
  config: Config,
  ruta: string,
  opciones: { metodo?: string; cuerpo?: BodyInit; tipo?: string },
): Promise<T> => {
  const r = await pedirDJ(config, ruta, { metodo: 'POST', ...opciones });
  const texto = await r.text();
  if (!r.ok) {
    let mensaje = texto.slice(0, 300);
    try {
      const d = JSON.parse(texto);
      mensaje = String(d.message ?? mensaje).replace(/\\u0022|"/g, '').slice(0, 300);
    } catch { /* texto plano */ }
    throw new ErrorDJ(r.status, mensaje);
  }
  return (texto ? JSON.parse(texto) : null) as T;
};

/** Un archivo (JSON, zip) dentro de un formulario multipart, como lo piden los importadores. */
export const formularioConArchivo = (
  campo: string,
  nombre: string,
  contenido: string | Uint8Array,
  tipo: string,
  extra: Record<string, string> = {},
): FormData => {
  const form = new FormData();
  for (const [k, v] of Object.entries(extra)) form.append(k, v);
  const bytes = typeof contenido === 'string' ? new TextEncoder().encode(contenido) : contenido;
  // Copia a un ArrayBuffer propio: Blob no acepta vistas sobre SharedArrayBuffer.
  form.append(campo, new Blob([new Uint8Array(bytes)], { type: tipo }), nombre);
  return form;
};

// ── Organizar desde CODECOMP ──

/** Texto a identificador de DOMjudge: minusculas, sin tildes, solo [a-z0-9-]. */
export const slugDe = (texto: string, largo = 24): string =>
  texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, largo).replace(/-+$/, '') || 'x';

// DOMjudge exige ids en formato CLICS: [a-zA-Z0-9_.-], de 1 a 36 caracteres.
export const ID_CLICS = /^[a-zA-Z0-9_.-]{1,36}$/;

/** Huella de 6 caracteres (FNV-1a en base 36) para distinguir ids de concursos distintos. */
export const huellaDe = (texto: string): string => {
  let h = 0x811c9dc5;
  for (const c of new TextEncoder().encode(texto)) h = Math.imul(h ^ c, 0x01000193) >>> 0;
  return h.toString(36).padStart(6, '0').slice(-6);
};

/**
 * Id del concurso: inicio del nombre, fecha de inicio (en Bogota) y huella del nombre completo,
 * para que dos nombres que empiezan igual el mismo dia no choquen. Hasta 30 caracteres.
 */
export const idConcurso = (nombre: string, inicio: Date): string => {
  const fecha = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(inicio);
  return `${slugDe(nombre, 14)}-${fecha.replaceAll('-', '')}-${huellaDe(nombre.trim().toLowerCase())}`;
};

/** Id del equipo (y usuario de su cuenta de respaldo): huella del concurso y nombre, hasta 33 caracteres. */
export const idEquipo = (cid: string, nombre: string): string => `t-${huellaDe(cid)}-${slugDe(nombre, 24)}`;

/** Id del problema en DOMjudge: unico aunque el mismo problema del banco este en varios concursos. */
export const idProblemaDJ = (slug: string, cid: string): string => `${slugDe(slug, 22)}-${huellaDe(cid)}`;

/** Minutos -> "H:MM:SS.000", el formato de duracion de DOMjudge. */
export const duracionDJ = (minutos: number): string => {
  const m = Math.max(0, Math.round(minutos));
  return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}:00.000`;
};

/** Hora en ISO con el desfase de Bogota (-05:00), como la espera el importador de concursos. */
export const isoBogota = (fecha: Date): string => {
  const local = new Date(fecha.getTime() - 5 * 3600_000).toISOString().slice(0, 19);
  return `${local}-05:00`;
};

export const concursoJson = (
  d: { cid: string; nombre: string; inicio: Date; duracionMin: number; congeladoMin: number },
) => ({
  id: d.cid,
  name: d.nombre,
  formal_name: d.nombre,
  start_time: isoBogota(d.inicio),
  duration: duracionDJ(d.duracionMin),
  scoreboard_freeze_duration: duracionDJ(d.congeladoMin),
  penalty_time: 20,
});

/** Registro completo del equipo: reimportar sin grupo u organizacion los deja en blanco. */
export const equipoJson = (teamId: string, nombre: string) => ({
  id: teamId,
  name: nombre,
  display_name: nombre,
  group_ids: ['participants'],
  organization_id: 'ufpso',
});

/** Cuenta de respaldo del equipo: reimportarla sin equipo o sin rol la deja inservible. */
export const cuentaJson = (teamId: string, nombre: string, clave: string) => ({
  id: teamId,
  username: teamId,
  name: nombre,
  password: clave,
  type: 'team',
  team_id: teamId,
});

export const escaparHtml = (t: string): string =>
  t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const SECCIONES = new Set(['Entrada', 'Salida', 'Input', 'Output', 'Nota', 'Notas']);

/** Enunciado del banco (texto con parrafos) a HTML seguro; solo se conservan <sup> y <sub>. */
export const htmlDeEnunciado = (texto: string): string =>
  texto.trim().split(/\n\s*\n/).map((bloque) => {
    const b = bloque.trim();
    if (SECCIONES.has(b)) return `<h3>${escaparHtml(b)}</h3>`;
    const seguro = escaparHtml(b).replace(/&lt;(\/?)(sup|sub)&gt;/g, '<$1$2>');
    return `<p>${seguro.replace(/\n/g, '<br>')}</p>`;
  }).join('\n');

export interface ProblemaBanco {
  titulo: string;
  enunciado: string;
  limiteSegundos: number;
  memoriaMb: number;
  fuente: string | null;
  casos: { entrada: string; salida: string; oculto: boolean }[];
}

const conSalto = (t: string) => (t.endsWith('\n') ? t : t + '\n');

/** Paquete de DOMjudge (formato Kattis) armado con los casos del banco. */
export const paqueteKattis = (p: ProblemaBanco, letra: string): Uint8Array => {
  const ejemplos = p.casos.filter((c) => !c.oculto);
  const filas = ejemplos.map((c) =>
    `<tr><td><pre>${escaparHtml(c.entrada)}</pre></td><td><pre>${escaparHtml(c.salida)}</pre></td></tr>`
  ).join('');
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${escaparHtml(p.titulo)}</title>
<style>body{font-family:system-ui,sans-serif;max-width:860px;margin:24px auto;padding:0 18px;line-height:1.55}
h3{margin:22px 0 6px;text-transform:uppercase;color:#0736FE}table{border-collapse:collapse;width:100%}
td,th{border:2px solid #000;padding:6px 10px;vertical-align:top;text-align:left}pre{margin:0;white-space:pre-wrap}</style>
</head><body><h1>${escaparHtml(letra)}. ${escaparHtml(p.titulo)}</h1>
<p>Tiempo limite: ${p.limiteSegundos} s · Memoria: ${p.memoriaMb} MB</p>
${htmlDeEnunciado(p.enunciado)}
<h3>Ejemplos</h3><table><tr><th>Entrada</th><th>Salida</th></tr>${filas}</table>
${p.fuente ? `<p>Fuente: ${escaparHtml(p.fuente)}</p>` : ''}</body></html>`;
  const archivos: Record<string, Uint8Array> = {
    'domjudge-problem.ini': strToU8(`name="${p.titulo.replace(/"/g, "'")}"\ntimelimit=${p.limiteSegundos}\n`),
    'problem.yaml': strToU8(`name: "${p.titulo.replace(/"/g, "'")}"\nlimits:\n  memory: ${p.memoriaMb}\n`),
    'problem.html': strToU8(html),
  };
  let s = 0;
  let h = 0;
  for (const c of p.casos) {
    const base = c.oculto ? `data/secret/${String(++h).padStart(2, '0')}` : `data/sample/${String(++s).padStart(2, '0')}`;
    archivos[`${base}.in`] = strToU8(conSalto(c.entrada));
    archivos[`${base}.ans`] = strToU8(conSalto(c.salida));
  }
  return zipSync(archivos, { level: 6 });
};

export interface AclaracionDJ {
  id: string;
  from_team_id: string | null;
  to_team_id: string | null;
  reply_to_id: string | null;
  problem_id: string | null;
  text: string;
  time: string;
  contest_time?: string;
}

export interface FilaMarcadorDJ {
  rank: number;
  team_id: string;
  score: { num_solved: number; total_time: number };
  problems: {
    problem_id: string;
    num_judged: number;
    num_pending: number;
    solved: boolean;
    first_to_solve?: boolean;
    time?: number;
  }[];
}

/**
 * Filas del marcador solo con los equipos del concurso (DOMjudge abre todos los concursos a
 * todos los equipos). El puesto se recalcula; empatan quienes tienen mismos resueltos y tiempo.
 */
export const filasMarcador = (
  filas: FilaMarcadorDJ[],
  equipos: Map<string, string>,
  letras: Map<string, string>,
  propio: string | null,
) => {
  const nuestras = filas.filter((f) => equipos.has(f.team_id));
  let puesto = 0;
  return nuestras.map((f, i) => {
    const previa = nuestras[i - 1];
    const empata = previa && previa.score.num_solved === f.score.num_solved &&
      previa.score.total_time === f.score.total_time;
    if (!empata) puesto = i + 1;
    return {
      puesto,
      equipo: equipos.get(f.team_id) as string,
      propio: f.team_id === propio,
      resueltos: f.score.num_solved,
      tiempo: f.score.total_time,
      problemas: f.problems.map((p) => ({
        letra: letras.get(p.problem_id) ?? p.problem_id,
        resuelto: p.solved,
        primero: Boolean(p.first_to_solve),
        intentos: p.num_judged + p.num_pending,
        pendientes: p.num_pending,
        minuto: p.time ?? null,
      })),
    };
  });
};

/** Lo que un equipo puede leer: avisos generales, lo que le escribieron y lo que envio. */
export const aclaracionesDeEquipo = (lista: AclaracionDJ[], teamId: string): AclaracionDJ[] =>
  lista.filter((a) =>
    a.from_team_id === teamId || a.to_team_id === teamId ||
    (a.from_team_id === null && a.to_team_id === null)
  );
