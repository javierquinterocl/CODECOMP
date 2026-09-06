
import { rechazo, type Rechazo } from './http.ts';

const MAX_TEXTO = 10000;

export const pesaMas = (texto: string | undefined, limite: number): boolean =>
  new TextEncoder().encode(texto ?? '').length > limite;

// Un programa puede imprimir megas de stdout; no van a la base.
export const recortar = (texto: unknown): string => {
  if (typeof texto !== 'string' || !texto) return '';
  return texto.length > MAX_TEXTO ? `${texto.slice(0, MAX_TEXTO)}\n...(recortado)` : texto;
};

export interface EntradaEnvio {
  source_code?: unknown;
  language_id?: unknown;
  stdin?: unknown;
  expected_output?: unknown;
  problema_numero?: unknown;
  lenguaje?: unknown;
}

export interface EnvioValido {
  sourceCode: string;
  languageId: number;
  entrada: string;
  expectedOutput: string | null;
  problemaNumero: number | null;
  lenguajeSlug: string | null;
}

// Mismos codigos de error que el backend anterior: judge0Service.js los espera.
export const validarEnvio = (
  cuerpo: EntradaEnvio | null,
  opciones: { maxCodigoBytes: number; maxEntradaBytes: number; lenguajesPermitidos: Set<number> },
): { ok: true; envio: EnvioValido } | { ok: false; rechazo: Rechazo } => {
  const c = cuerpo ?? {};
  const sourceCode = c.source_code;
  const languageId = c.language_id;

  if (typeof sourceCode !== 'string' || !sourceCode.trim()) {
    return { ok: false, rechazo: rechazo(400, 'sin-codigo', 'source_code es obligatorio.') };
  }
  if (pesaMas(sourceCode, opciones.maxCodigoBytes)) {
    return {
      ok: false,
      rechazo: rechazo(413, 'codigo-muy-largo', 'El codigo supera los 64 KB permitidos.'),
    };
  }
  if (!Number.isInteger(languageId) || !opciones.lenguajesPermitidos.has(languageId as number)) {
    return { ok: false, rechazo: rechazo(400, 'lenguaje', 'language_id no esta soportado.') };
  }

  const entrada = typeof c.stdin === 'string' ? c.stdin : '';
  if (pesaMas(entrada, opciones.maxEntradaBytes)) {
    return {
      ok: false,
      rechazo: rechazo(413, 'entrada-muy-larga', 'La entrada supera los 64 KB permitidos.'),
    };
  }

  return {
    ok: true,
    envio: {
      sourceCode,
      languageId: languageId as number,
      entrada,
      expectedOutput:
        typeof c.expected_output === 'string' && c.expected_output ? c.expected_output : null,
      problemaNumero: Number.isInteger(c.problema_numero) ? (c.problema_numero as number) : null,
      lenguajeSlug: typeof c.lenguaje === 'string' ? c.lenguaje : null,
    },
  };
};

export const hashDe = async (texto: string): Promise<string> => {
  const datos = new TextEncoder().encode(texto);
  const buffer = await crypto.subtle.digest('SHA-256', datos);
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
};
