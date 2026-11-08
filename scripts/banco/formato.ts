// Forma de un problema del banco local y su validacion. Solo funciones puras.

import { categoriaDeProblema, CATEGORIAS } from '../../src/scripts/problemsData.js';

export interface Caso {
  entrada: string;
  salida: string;
  oculto: boolean;
}

export interface Problema {
  clave: string; // unica y estable, ej. icpc-latam-2024-A
  numero: number; // problem_number, rango del banco local
  fuente: string; // ej. ICPC Latin American Regional 2024, problema A
  fuente_url: string;
  titulo: string; // ingles
  enunciado: string; // ingles, texto plano con simbolos Unicode
  titulo_es: string | null;
  enunciado_es: string | null;
  limite_tiempo_s: number;
  memoria_mb: number;
  rating: number;
  rating_origen: 'marcador' | 'estimado';
  marcador: { equipos: number; resolvieron: number } | null;
  categoria: string;
  tags: string[];
  casos: Caso[];
  casos_generados: boolean;
}

export const NUMERO_INICIAL = 100001;
export const MAX_CASOS = 10;
export const MAX_BYTES_CASO = 64 * 1024;

const TAGS_VALIDOS = new Set([
  'implementation',
  ...CATEGORIAS.flatMap((c: { tags: string[] }) => c.tags),
]);
const SLUGS = new Set(CATEGORIAS.map((c: { slug: string }) => c.slug));

// Dificultad inicial con la misma curva del Elo de skillEngine: un equipo promedio del concurso
// equivale a 1500 y resolverlo con probabilidad p da 1500 + 400 log10((1 - p) / p).
export const ratingDeMarcador = (resolvieron: number, equipos: number): number => {
  const p = (resolvieron + 0.5) / (equipos + 1);
  const crudo = 1500 + 400 * Math.log10((1 - p) / p);
  return Math.min(3500, Math.max(800, Math.round(crudo / 50) * 50));
};

const bytes = (texto: string) => new TextEncoder().encode(texto).length;

export const validar = (p: Problema): string[] => {
  const e: string[] = [];
  const pre = `${p.clave}:`;
  if (!/^[a-z0-9-]+$/.test(p.clave)) e.push(`${pre} clave invalida`);
  if (!Number.isInteger(p.numero) || p.numero < NUMERO_INICIAL) e.push(`${pre} numero fuera de rango`);
  for (const campo of ['fuente', 'fuente_url', 'titulo', 'enunciado'] as const) {
    if (!p[campo]?.trim()) e.push(`${pre} falta ${campo}`);
  }
  for (const texto of [p.enunciado, p.enunciado_es ?? '']) {
    // El visor no pinta LaTeX y cambia "<=" por un espacio.
    if (/\$|<=|>=|\\le\b|\\cdot/.test(texto)) e.push(`${pre} marcado LaTeX o <= en el enunciado`);
  }
  if ((p.titulo_es === null) !== (p.enunciado_es === null)) e.push(`${pre} traduccion a medias`);
  if (!(p.limite_tiempo_s > 0 && p.limite_tiempo_s <= 20)) e.push(`${pre} limite de tiempo raro`);
  if (!(p.memoria_mb >= 16 && p.memoria_mb <= 2048)) e.push(`${pre} memoria rara`);
  if (!(p.rating >= 800 && p.rating <= 3500)) e.push(`${pre} rating fuera de 800-3500`);
  if (p.rating_origen === 'marcador') {
    if (!p.marcador) e.push(`${pre} rating de marcador sin marcador`);
    else if (ratingDeMarcador(p.marcador.resolvieron, p.marcador.equipos) !== p.rating) {
      e.push(`${pre} rating no coincide con el marcador`);
    }
  }
  if (!SLUGS.has(p.categoria)) e.push(`${pre} categoria desconocida`);
  for (const t of p.tags) if (!TAGS_VALIDOS.has(t)) e.push(`${pre} tag desconocido "${t}"`);
  const calculada = categoriaDeProblema({ tags: p.tags, dificultadRating: p.rating });
  if (calculada !== p.categoria) e.push(`${pre} con esos tags la categoria seria ${calculada}`);
  if (!p.casos.length || p.casos.length > MAX_CASOS) e.push(`${pre} entre 1 y ${MAX_CASOS} casos`);
  if (!p.casos.some((c) => !c.oculto)) e.push(`${pre} sin ejemplo visible`);
  for (const [i, c] of p.casos.entries()) {
    if (bytes(c.entrada) > MAX_BYTES_CASO || bytes(c.salida) > MAX_BYTES_CASO) {
      e.push(`${pre} caso ${i + 1} supera 64 KB`);
    }
    if (!c.salida.trim()) e.push(`${pre} caso ${i + 1} sin salida`);
  }
  return e;
};
