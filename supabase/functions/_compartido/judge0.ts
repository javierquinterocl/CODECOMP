

import type { Config } from './config.ts';

export interface Envio {
  source_code: string;
  language_id: number;
  stdin: string;
  expected_output?: string;
}

export interface RespuestaJuez {
  ok: boolean;
  status: number;
  data: Record<string, unknown>;
}

export const cabeceras = (config: Config): Record<string, string> => {
  const base: Record<string, string> = { 'Content-Type': 'application/json' };
  if (config.modo === 'rapidapi') {
    return {
      ...base,
      'X-RapidAPI-Key': config.rapidApiKey,
      'X-RapidAPI-Host': new URL(config.judge0Url).host,
    };
  }
  return config.judge0Token ? { ...base, 'X-Auth-Token': config.judge0Token } : base;
};

export const urlDeEnvio = (judge0Url: string): string =>
  `${judge0Url.replace(/\/$/, '')}/submissions?base64_encoded=false&wait=true`;

export const ejecutar = async (envio: Envio, config: Config): Promise<RespuestaJuez> => {
  const corte = new AbortController();
  const alarma = setTimeout(() => corte.abort(), config.timeoutMs);

  try {
    const res = await fetch(urlDeEnvio(config.judge0Url), {
      method: 'POST',
      headers: cabeceras(config),
      body: JSON.stringify(envio),
      signal: corte.signal,
    });
    const texto = await res.text();
    let data: Record<string, unknown>;
    try {
      data = texto ? JSON.parse(texto) : {};
    } catch {
      data = { message: texto };
    }
    return { ok: res.ok, status: res.status, data };
  } finally {
    clearTimeout(alarma);
  }
};

// status.id de Judge0 -> enum submission_verdict.
export const veredictoDe = (statusId: number | undefined): string => {
  switch (statusId) {
    case 3:
      return 'ACCEPTED';
    case 4:
      return 'WRONG_ANSWER';
    case 5:
      return 'TIME_LIMIT_EXCEEDED';
    case 6:
      return 'COMPILATION_ERROR';
    default:
      return 'RUNTIME_ERROR';
  }
};
