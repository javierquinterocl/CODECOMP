// De los archivos de ejercicios a filas de `fundamentos_ejercicios`. Solo funciones puras.

import { EJERCICIOS } from './ejercicios_fundamentos.js';
import { EJERCICIOS_PRACTICA } from './ejercicios_practica.js';
import { TEMAS } from '../../src/scripts/fundamentosData.js';

export interface Fila {
  nivel: string;
  numero: number;
  tema: string;
  dificultad: number;
  titulo: string;
  resumen: string;
  descripcion: string[];
  entrada: string;
  salida: string;
  ejemplos: { entrada: string; salida: string }[];
  pista_concepto: string | null;
}

export const ESPERADOS: Record<string, number> = { fundamentos: 50, practica: 50 };

// deno-lint-ignore no-explicit-any
const filaDe = (nivel: string, e: any): Fila => ({
  nivel,
  numero: e.numero,
  tema: e.tema,
  dificultad: e.nivel,
  titulo: e.titulo,
  resumen: e.resumen,
  descripcion: e.descripcion,
  entrada: e.entrada,
  salida: e.salida,
  ejemplos: e.ejemplos,
  pista_concepto: e.pistaConcepto ?? null,
});

export const filasDeArchivos = (): Fila[] => [
  ...EJERCICIOS.map((e: unknown) => filaDe('fundamentos', e)),
  ...EJERCICIOS_PRACTICA.map((e: unknown) => filaDe('practica', e)),
];

const esTexto = (v: unknown): boolean => typeof v === 'string' && v.trim().length > 0;

export const validar = (filas: Fila[]): string[] => {
  const errores: string[] = [];
  const temas = new Set(TEMAS.map((t: { slug: string }) => t.slug));
  const vistos = new Set<string>();

  for (const [nivel, esperado] of Object.entries(ESPERADOS)) {
    const total = filas.filter((f) => f.nivel === nivel).length;
    if (total !== esperado) errores.push(`${nivel}: ${total} ejercicios, se esperaban ${esperado}`);
  }

  for (const f of filas) {
    const clave = `${f.nivel}:${f.numero}`;
    if (vistos.has(clave)) errores.push(`${clave}: numero repetido`);
    vistos.add(clave);
    if (!Number.isInteger(f.numero) || f.numero < 1) errores.push(`${clave}: numero invalido`);
    if (!temas.has(f.tema)) errores.push(`${clave}: tema desconocido "${f.tema}"`);
    if (!Number.isInteger(f.dificultad) || f.dificultad < 1 || f.dificultad > 5) {
      errores.push(`${clave}: dificultad fuera de 1 a 5`);
    }
    for (const campo of ['titulo', 'resumen', 'entrada', 'salida'] as const) {
      if (!esTexto(f[campo])) errores.push(`${clave}: falta ${campo}`);
    }
    if (!Array.isArray(f.descripcion) || !f.descripcion.length || !f.descripcion.every(esTexto)) {
      errores.push(`${clave}: descripcion vacia`);
    }
    const ejemplosBien = Array.isArray(f.ejemplos) && f.ejemplos.length > 0 &&
      f.ejemplos.every((ej) => typeof ej.entrada === 'string' && esTexto(ej.salida));
    if (!ejemplosBien) errores.push(`${clave}: ejemplos invalidos`);
  }
  return errores;
};

/** Campos que difieren entre la fila del archivo y la de la base. */
export const diferencias = (archivo: Fila, base: Record<string, unknown>): string[] =>
  (Object.keys(archivo) as (keyof Fila)[])
    .filter((campo) => JSON.stringify(archivo[campo]) !== JSON.stringify(base[campo] ?? null));
