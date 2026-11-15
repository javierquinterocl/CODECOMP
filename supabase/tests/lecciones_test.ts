import { assertEquals } from '@std/assert';
import * as P from '../../src/scripts/lecciones/pasos.js';

// deno-lint-ignore no-explicit-any
const L = P as any;
// deno-lint-ignore no-explicit-any
const ultimo = (pasos: any[]) => pasos[pasos.length - 1];

Deno.test('palindromo: limpia la entrada, detecta el resultado y la primera pareja distinta', () => {
  assertEquals(L.validarPalindromo('Anita lava la tina').valor, 'anitalavalatina');
  assertEquals(L.validarPalindromo('!!!').error !== undefined, true);
  assertEquals(ultimo(L.pasosPalindromo('reconocer')).resultado, true);
  const no = L.pasosPalindromo('codecomp');
  assertEquals([ultimo(no).resultado, ultimo(no).linea], [false, 2]);
  assertEquals(ultimo(L.pasosPalindromo('a')).resultado, true);
});

Deno.test('busqueda binaria: encuentra, avisa si no esta y ordena la entrada', () => {
  const v = L.validarBinaria('9 1 5 3 7', '7').valor;
  assertEquals([v.arreglo, v.reordenado], [[1, 3, 5, 7, 9], true]);
  const si = L.pasosBinaria(v);
  assertEquals([ultimo(si).resultado, ultimo(si).punteros.mid], [true, 3]);
  const no = L.pasosBinaria({ arreglo: [1, 3, 5, 7, 9], objetivo: 4 });
  assertEquals([ultimo(no).resultado, ultimo(no).linea], [false, 6]);
  // Como mucho log2(n) + 1 vueltas.
  assertEquals(no.filter((x: { linea: number }) => x.linea === 2).length <= 3, true);
  assertEquals(L.validarBinaria('1', '1').error !== undefined, true);
});

Deno.test('criba: deja exactamente los primos hasta n', () => {
  const final = ultimo(L.pasosCriba(30));
  const primos = final.celdas.filter((c: { estado: string }) => c.estado === 'bien').map((c: { v: number }) => c.v);
  assertEquals(primos, [2, 3, 5, 7, 11, 13, 17, 19, 23, 29]);
  assertEquals(L.validarCriba('200').error !== undefined, true);
});

Deno.test('bfs: distancias minimas, nodos sin alcanzar y entrada invalida', () => {
  const v = L.validarBfs('1-2, 1-3, 2-4, 3-4, 4-5, 6-7', '1').valor;
  const final = ultimo(L.pasosBfs(v));
  const dist = Object.fromEntries(final.nodos.map((n: { id: number; dist: number | null }) => [n.id, n.dist]));
  assertEquals(dist, { 1: 0, 2: 1, 3: 1, 4: 2, 5: 3, 6: null, 7: null });
  assertEquals(final.nota.includes('2 no se alcanzan'), true);
  assertEquals(L.validarBfs('1-1', '1').error !== undefined, true);
  assertEquals(L.validarBfs('1-9', '1').error !== undefined, true);
  assertEquals(L.validarBfs('1-2', '5').error !== undefined, true);
});
