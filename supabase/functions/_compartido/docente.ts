// Reglas de la vista docente: alertas por estudiante y parecido entre soluciones. Solo funciones puras.

export const DIAS_INACTIVO = 7;
export const FALLOS_ATASCADO = 3;
export const CAIDA_NIVEL = 30;
export const UMBRAL_PARECIDO = 0.85;
const MS_DIA = 86_400_000;

export type Alerta = 'sin-actividad' | 'inactivo' | 'atascado' | 'en-caida';

export interface DatosAlerta {
  ahora: Date;
  ultimaActividad: Date | null;
  /** Mayor numero de fallos contados en un problema sin aceptado, en los ultimos 7 dias. */
  fallosSinAceptar: number;
  nivelActual: number;
  nivelHace14Dias: number;
}

export const alertasDe = (d: DatosAlerta): Alerta[] => {
  const alertas: Alerta[] = [];
  if (!d.ultimaActividad) alertas.push('sin-actividad');
  else if (d.ahora.getTime() - d.ultimaActividad.getTime() >= DIAS_INACTIVO * MS_DIA) {
    alertas.push('inactivo');
  }
  if (d.fallosSinAceptar >= FALLOS_ATASCADO) alertas.push('atascado');
  if (d.nivelActual <= d.nivelHace14Dias - CAIDA_NIVEL) alertas.push('en-caida');
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
