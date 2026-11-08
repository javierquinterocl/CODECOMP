// Validacion de lo que el navegador manda para el registro del estudiante. Solo funciones puras.

// El navegador envia cada 5 minutos; se acepta algo de margen por pestanas en segundo plano.
export const MAX_SEGUNDOS_POR_RESUMEN = 900;
export const MAX_PEGADOS_POR_RESUMEN = 500;
export const MAX_CARACTERES_POR_RESUMEN = 500_000;

export interface Resumen {
  segundos: number;
  pegados: number;
  caracteres: number;
}

const entero = (valor: unknown, max: number): number | null =>
  Number.isInteger(valor) && (valor as number) >= 0 && (valor as number) <= max
    ? valor as number
    : null;

export const validarResumen = (cuerpo: Record<string, unknown> | null): Resumen | null => {
  if (!cuerpo) return null;
  const segundos = entero(cuerpo.segundos, MAX_SEGUNDOS_POR_RESUMEN);
  const pegados = entero(cuerpo.pegados ?? 0, MAX_PEGADOS_POR_RESUMEN);
  const caracteres = entero(cuerpo.caracteres_pegados ?? 0, MAX_CARACTERES_POR_RESUMEN);
  if (segundos === null || pegados === null || caracteres === null) return null;
  return { segundos, pegados, caracteres };
};

// Sin 0/O ni 1/I para que el codigo se dicte en clase sin confusiones.
const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export const nuevoCodigoClase = (): string => {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return [...bytes].map((b) => ALFABETO[b % ALFABETO.length]).join('');
};

export const normalizarCodigo = (valor: unknown): string | null => {
  if (typeof valor !== 'string') return null;
  const codigo = valor.trim().toUpperCase();
  return /^[A-Z0-9]{6}$/.test(codigo) ? codigo : null;
};

export const normalizarNombreClase = (valor: unknown): string | null => {
  if (typeof valor !== 'string') return null;
  const nombre = valor.trim().replace(/\s+/g, ' ');
  return nombre.length >= 3 && nombre.length <= 80 ? nombre : null;
};
