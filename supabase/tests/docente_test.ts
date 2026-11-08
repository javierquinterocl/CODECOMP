import { assert, assertEquals } from '@std/assert';
import { alertasDe, parecido, UMBRAL_PARECIDO } from '../functions/_compartido/docente.ts';

const AHORA = new Date('2026-11-07T12:00:00Z');
const dias = (n: number) => new Date(AHORA.getTime() - n * 86_400_000);
const base = {
  ahora: AHORA,
  ultimaActividad: dias(1),
  fallosSinAceptar: 0,
  nivelActual: 1000,
  nivelHace14Dias: 1000,
};

Deno.test('alertas: sin actividad, inactivo a los 7 dias, atascado y en caida', () => {
  assertEquals(alertasDe(base), []);
  assertEquals(alertasDe({ ...base, ultimaActividad: null }), ['sin-actividad']);
  assertEquals(alertasDe({ ...base, ultimaActividad: dias(6) }), []);
  assertEquals(alertasDe({ ...base, ultimaActividad: dias(7) }), ['inactivo']);
  assertEquals(alertasDe({ ...base, fallosSinAceptar: 2.5 }), []);
  assertEquals(alertasDe({ ...base, fallosSinAceptar: 3 }), ['atascado']);
  assertEquals(alertasDe({ ...base, nivelActual: 971 }), []);
  assertEquals(alertasDe({ ...base, nivelActual: 970 }), ['en-caida']);
});

const SOLUCION = `
#include <bits/stdc++.h>
using namespace std;
int main() {
  int n; cin >> n;
  long long suma = 0;
  for (int i = 0; i < n; i++) { long long x; cin >> x; suma += x; }
  cout << suma << endl;
}`;

Deno.test('parecido: igual salvo espacios y comentarios da 1', () => {
  const copia = SOLUCION.replace(/\n/g, '\n\n').replace('long long suma = 0;', '// acumulado\n long long   suma = 0;');
  assertEquals(parecido(SOLUCION, copia), 1);
});

Deno.test('parecido: otra solucion al mismo problema queda bajo el umbral', () => {
  const otra = `
n = int(input())
print(sum(int(input()) for _ in range(n)))`;
  assert(parecido(SOLUCION, otra) < UMBRAL_PARECIDO);
  assertEquals(parecido('', SOLUCION), 0);
});
