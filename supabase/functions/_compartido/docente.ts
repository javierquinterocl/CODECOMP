// Reglas de la vista docente: alertas por estudiante y parecido entre soluciones. Solo funciones puras.

export const DIAS_INACTIVO = 7;
export const FALLOS_ATASCADO = 3;
export const CAIDA_NIVEL = 30;
export const UMBRAL_PARECIDO = 0.85;
// Estancamiento (criterios aprobados por Andres el 2026-11-16).
export const MESETA_DIAS = 21;
export const MESETA_ENVIOS = 10;
export const MESETA_SUBIDA = 10;
export const TEMA_PROBLEMAS = 3;
export const TEMA_TASA = 0.25;
export const TEMA_ENVIOS = 6;
// Etiquetas tan generales que saldrían casi siempre como "el tema donde no avanza".
export const ETIQUETAS_GENERICAS = ['implementation', 'brute force', 'constructive algorithms', '*special', 'none'];
// Recién llegados a la clase: sin alertas de estancamiento hasta 14 días.
export const DIAS_NUEVO = 14;
export const PISTAS_RESUELTOS = 3;
export const PISTAS_PROPORCION = 0.7;
const MS_DIA = 86_400_000;

export type Alerta =
  | 'sin-actividad' | 'inactivo' | 'atascado' | 'en-caida'
  | 'meseta' | 'pistas' | 'atascado-fundamentos' | `tema:${string}`;

export interface DatosAlerta {
  ahora: Date;
  ultimaActividad: Date | null;
  /** Mayor numero de fallos contados en un problema sin aceptado, en los ultimos 7 dias. */
  fallosSinAceptar: number;
  nivelActual: number;
  /** Nivel al cierre más reciente de hace 14 días o más; null si no hay historial. */
  nivelHace14Dias: number | null;
  /** Días desde que entró a la clase. */
  diasEnClase?: number;
  /** Envíos evaluados en los últimos 21 días y si su primer envío es anterior a eso. */
  enviosMeseta?: number;
  practicaDesdeAntes?: boolean;
  /** Nivel al cierre más reciente de hace 21 días o más. */
  nivelHaceMeseta?: number;
  /** Etiqueta con 3+ problemas y menos del 25 % aceptado en 14 días (la peor), o null. */
  temaAtascado?: string | null;
  /** Problemas resueltos por primera vez en 30 días y cuántos con pista de nivel 2 o 3 antes. */
  resueltos30?: number;
  conAyuda30?: number;
  /** Mayor número de envíos fallidos en un mismo ejercicio de Fundamentos en 7 días, sin aceptar. */
  fallosFundamentos?: number;
}

export const alertasDe = (d: DatosAlerta): Alerta[] => {
  const alertas: Alerta[] = [];
  if (!d.ultimaActividad) alertas.push('sin-actividad');
  else if (d.ahora.getTime() - d.ultimaActividad.getTime() >= DIAS_INACTIVO * MS_DIA) {
    alertas.push('inactivo');
  }
  if (d.fallosSinAceptar >= FALLOS_ATASCADO) alertas.push('atascado');
  if (d.nivelHace14Dias !== null && d.nivelActual <= d.nivelHace14Dias - CAIDA_NIVEL) alertas.push('en-caida');
  // El estancamiento solo se mide con algo de recorrido en la clase.
  if ((d.diasEnClase ?? Infinity) < DIAS_NUEVO) {
    if ((d.fallosFundamentos ?? 0) >= FALLOS_ATASCADO) alertas.push('atascado-fundamentos');
    return alertas;
  }
  if (
    d.practicaDesdeAntes && (d.enviosMeseta ?? 0) >= MESETA_ENVIOS &&
    d.nivelHaceMeseta !== undefined && d.nivelActual - d.nivelHaceMeseta < MESETA_SUBIDA &&
    !alertas.includes('en-caida')
  ) alertas.push('meseta');
  if (d.temaAtascado) alertas.push(`tema:${d.temaAtascado}`);
  if ((d.resueltos30 ?? 0) >= PISTAS_RESUELTOS && (d.conAyuda30 ?? 0) / d.resueltos30! >= PISTAS_PROPORCION) {
    alertas.push('pistas');
  }
  if ((d.fallosFundamentos ?? 0) >= FALLOS_ATASCADO) alertas.push('atascado-fundamentos');
  return alertas;
};

// Sin comentarios ni espacios; los nombres se conservan porque casi nadie los cambia al copiar.
const fichas = (codigo: string): string[] =>
  codigo
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(\/\/|#).*$/gm, ' ')
    .toLowerCase()
    .match(/[a-z_][a-z0-9_]*|\d+|[^\s\w]/g) ?? [];

const tejas = (codigo: string, n = 4): Set<string> => {
  const f = fichas(codigo);
  const s = new Set<string>();
  for (let i = 0; i + n <= f.length; i++) s.add(f.slice(i, i + n).join(' '));
  return s;
};

/** Jaccard de secuencias de 4 fichas: 1 = igual salvo espacios y comentarios. */
export const parecido = (a: string, b: string): number => {
  const ta = tejas(a);
  const tb = tejas(b);
  if (!ta.size || !tb.size) return 0;
  let comunes = 0;
  for (const t of ta) if (tb.has(t)) comunes++;
  return comunes / (ta.size + tb.size - comunes);
};
