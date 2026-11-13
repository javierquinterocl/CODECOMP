// Validacion de lo que el navegador manda para el registro del estudiante. Solo funciones puras.

// El navegador envia cada minuto; se acepta margen por envios que no salieron a tiempo.
export const MAX_SEGUNDOS_POR_RESUMEN = 900;
export const MAX_PEGADOS_POR_RESUMEN = 500;
export const MAX_CARACTERES_POR_RESUMEN = 500_000;
export const MAX_EJERCICIOS_POR_RESUMEN = 20;
export const NIVELES_FUNDAMENTOS = ['fundamentos', 'practica', 'avanzado'] as const;

export type TiempoEjercicio =
  | { tipo: 'problema'; numero: number; segundos: number }
  | { tipo: 'fundamentos'; nivel: string; numero: number; segundos: number };

export interface Resumen {
  segundos: number;
  pegados: number;
  caracteres: number;
  ejercicios: TiempoEjercicio[];
}

const entero = (valor: unknown, max: number): number | null =>
  Number.isInteger(valor) && (valor as number) >= 0 && (valor as number) <= max
    ? valor as number
    : null;

/** Tiempo por ejercicio: cada entrada valida o el resumen entero se rechaza. */
const validarEjercicios = (valor: unknown, segundosTotales: number): TiempoEjercicio[] | null => {
  if (valor === undefined) return [];
  if (!Array.isArray(valor) || valor.length > MAX_EJERCICIOS_POR_RESUMEN) return null;
  const salida: TiempoEjercicio[] = [];
  let suma = 0;
  for (const e of valor) {
    if (!e || typeof e !== 'object') return null;
    const { tipo, nivel } = e as Record<string, unknown>;
    const numero = entero((e as Record<string, unknown>).numero, 10_000_000);
    const segundos = entero((e as Record<string, unknown>).segundos, MAX_SEGUNDOS_POR_RESUMEN);
    if (numero === null || numero === 0 || segundos === null || segundos === 0) return null;
    suma += segundos;
    if (tipo === 'problema') {
      salida.push({ tipo, numero, segundos });
    } else if (tipo === 'fundamentos' && NIVELES_FUNDAMENTOS.includes(nivel as typeof NIVELES_FUNDAMENTOS[number])) {
      salida.push({ tipo, nivel: nivel as string, numero, segundos });
    } else {
      return null;
    }
  }
  // El tiempo en ejercicios es parte del tiempo activo, nunca mas.
  return suma <= segundosTotales ? salida : null;
};

export const validarResumen = (cuerpo: Record<string, unknown> | null): Resumen | null => {
  if (!cuerpo) return null;
  const segundos = entero(cuerpo.segundos, MAX_SEGUNDOS_POR_RESUMEN);
  const pegados = entero(cuerpo.pegados ?? 0, MAX_PEGADOS_POR_RESUMEN);
  const caracteres = entero(cuerpo.caracteres_pegados ?? 0, MAX_CARACTERES_POR_RESUMEN);
  if (segundos === null || pegados === null || caracteres === null) return null;
  const ejercicios = validarEjercicios(cuerpo.ejercicios, segundos);
  if (ejercicios === null) return null;
  return { segundos, pegados, caracteres, ejercicios };
};

/** La purga de 12 meses corre como mucho una vez al dia por instancia. */
export const tocaPurgar = (ultima: string | null, hoy: string): boolean => ultima !== hoy;

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
