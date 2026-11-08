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
export interface UsuarioDJ {
  id: string;
  username: string;
  email: string | null;
  team_id: string | null;
  enabled?: boolean;
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

/** Usuario de DOMjudge con ese correo y un equipo asignado. */
export const usuarioDeCorreo = (usuarios: UsuarioDJ[], correo: string | null): UsuarioDJ | null => {
  if (!correo) return null;
  const buscado = correo.trim().toLowerCase();
  return usuarios.find((u) =>
    u.team_id && u.enabled !== false && (u.email ?? '').trim().toLowerCase() === buscado
  ) ?? null;
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
  { conCuenta = true, metodo = 'GET', cuerpo }: {
    conCuenta?: boolean;
    metodo?: string;
    cuerpo?: BodyInit;
  } = {},
): Promise<Response> => {
  const cabeceras = new Headers({ Accept: 'application/json' });
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
