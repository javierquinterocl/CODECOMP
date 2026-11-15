import { assertEquals } from '@std/assert';
import * as B from '../../src/scripts/lecciones/pasosBase.js';
import * as C from '../../src/scripts/lecciones/contenido.js';

// deno-lint-ignore no-explicit-any
const L = B as any;
// deno-lint-ignore no-explicit-any
const ultimo = (pasos: any[]) => pasos[pasos.length - 1];

Deno.test('traza, collatz y patron: resultado final correcto y topes de entrada', () => {
  assertEquals(ultimo(L.pasosTraza(5)).filas.at(-1), [5, 15]);
  assertEquals(L.validarTraza('13').error !== undefined, true);
  assertEquals(ultimo(L.pasosCollatz(6)).filas.length - 1, 8);
  assertEquals(ultimo(L.pasosCollatz(27)).filas.length <= 61, true);
  assertEquals(ultimo(L.pasosPatron(5)).filas.at(-1), [5, 10, '+4']);
});

Deno.test('mcd y monedas', () => {
  assertEquals(ultimo(L.pasosMcd({ a: 48, b: 18 })).nota.includes('el MCD es 6'), true);
  const v = L.validarMonedas('1850', '50 1000 500 200 100').valor;
  assertEquals(v.monedas, [1000, 500, 200, 100, 50]);
  const fin = ultimo(L.pasosMonedas(v));
  assertEquals([fin.resultado, fin.filas.map((f: number[]) => f[1])], [true, [1, 1, 1, 1, 1]]);
  assertEquals(ultimo(L.pasosMonedas({ monto: 7, monedas: [5, 3] })).resultado, false);
});

Deno.test('escaleras, dfs y parentesis', () => {
  const dp = ultimo(L.pasosEscaleras(10)).celdas.map((c: { v: number }) => c.v);
  assertEquals(dp, [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89]);
  const dfs = ultimo(L.pasosDfs({ nodos: [1, 2, 3, 4], aristas: [[1, 2], [1, 3], [2, 4]], inicio: 1 }));
  assertEquals(Object.fromEntries(dfs.nodos.map((n: { id: number; dist: number }) => [n.id, n.dist])), { 1: 1, 2: 2, 4: 3, 3: 4 });
  assertEquals(ultimo(L.pasosParentesis('([]{})')).resultado, true);
  assertEquals(ultimo(L.pasosParentesis('(]')).resultado, false);
  assertEquals(ultimo(L.pasosParentesis('((')).resultado, false);
  assertEquals(L.validarParentesis('a+b').error !== undefined, true);
});

Deno.test('recorrido: suma y mayor con negativos', () => {
  const fin = ultimo(L.pasosRecorrido([-4, -2, -9]));
  assertEquals(fin.nota.includes('suma = -15 y mayor = -2'), true);
});

Deno.test('las 8 lecciones: estructura completa y cada visualizacion arranca con sus datos iniciales', () => {
  // deno-lint-ignore no-explicit-any
  const lecciones = (C as any).LECCIONES;
  const slugs = ['principiante', 'ad-hoc', 'cadenas', 'matematicas', 'estructuras-de-datos', 'paradigmas', 'grafos', 'geometria'];
  assertEquals(slugs.every((s) => lecciones[s]), true);
  for (const s of slugs) {
    const l = lecciones[s];
    assertEquals([s, l.conceptos.length >= 2, l.preguntas.length, Boolean(l.codigo.cpp && l.codigo.python)], [s, true, 3, true]);
    // deno-lint-ignore no-explicit-any
    const visuales = [l.visual, ...l.conceptos.map((c: any) => c.visual)].filter((v) => v && v.tipo !== 'widget');
    for (const v of visuales) {
      // deno-lint-ignore no-explicit-any
      const r = v.generar(Object.fromEntries(v.campos.map((c: any) => [c.id, c.inicial])));
      assertEquals([s, r.error, r.pasos.length > 1, r.pasos.every((p: { linea: number }) => p.linea < v.pseudo.length)], [s, undefined, true, true]);
    }
  }
});
