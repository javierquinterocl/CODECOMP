import { assert, assertEquals } from '@std/assert';
import { alertasDe, motivosDePegado, parecido, UMBRAL_PARECIDO } from '../functions/_compartido/docente.ts';

const aceptado = {
  caracteresPegados: 400,
  largoCodigo: 500,
  primerIntento: true,
  rating: 1600,
  nivel: 1200,
  segundosActivos: 60,
};

Deno.test('motivosDePegado exige un pegado grande y una senal mas', () => {
  assertEquals(motivosDePegado(aceptado), ['sobre-nivel', 'poco-tiempo']);
  // Sin pegado grande no hay sospecha aunque sea rapido y por encima del nivel.
  assertEquals(motivosDePegado({ ...aceptado, caracteresPegados: 150 }), []);
  assertEquals(motivosDePegado({ ...aceptado, caracteresPegados: 250 }), []);
  // Pego mucho, pero con varios intentos, a su nivel y con tiempo: no.
  assertEquals(motivosDePegado({ ...aceptado, primerIntento: false, segundosActivos: 900 }), []);
  assertEquals(motivosDePegado({ ...aceptado, rating: 1300, segundosActivos: 900 }), []);
});

Deno.test('motivosDePegado nunca cuenta un dato ausente como cumplido', () => {
  assertEquals(motivosDePegado({ ...aceptado, caracteresPegados: null }), []);
  assertEquals(motivosDePegado({ ...aceptado, rating: 1200, segundosActivos: null }), []);
});

Deno.test('dos resueltos con pegado en 14 dias dan la alerta, incluso a un recien llegado', () => {
  const datos = { ...{ ahora: new Date(), ultimaActividad: new Date(), fallosSinAceptar: 0, nivelActual: 1000, nivelHace14Dias: null } };
  assert(alertasDe({ ...datos, resueltosConPegado: 2, diasEnClase: 1 }).includes('pegado'));
  assert(!alertasDe({ ...datos, resueltosConPegado: 1 }).includes('pegado'));
});

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
  // Sin historial de hace 14 días no hay caída que medir.
  assertEquals(alertasDe({ ...base, nivelActual: 900, nivelHace14Dias: null }), []);
});

Deno.test('alertas de estancamiento: meseta, tema, pistas y Fundamentos', () => {
  const activo = { ...base, diasEnClase: 30, practicaDesdeAntes: true, enviosMeseta: 12, nivelHaceMeseta: 995 };
  assertEquals(alertasDe(activo), ['meseta']);
  assertEquals(alertasDe({ ...activo, nivelActual: 1005 }), []); // subió 10: no es meseta
  assertEquals(alertasDe({ ...activo, enviosMeseta: 9 }), []); // practica poco: no se mide
  assertEquals(alertasDe({ ...activo, nivelHaceMeseta: undefined }), []); // sin historial
  assertEquals(alertasDe({ ...activo, practicaDesdeAntes: false }), []); // empezó hace menos de 3 semanas
  assertEquals(alertasDe({ ...base, diasEnClase: 30, temaAtascado: 'graphs' }), ['tema:graphs']);
  assertEquals(alertasDe({ ...base, diasEnClase: 30, resueltos30: 4, conAyuda30: 3 }), ['pistas']);
  assertEquals(alertasDe({ ...base, diasEnClase: 30, resueltos30: 4, conAyuda30: 2 }), []);
  assertEquals(alertasDe({ ...base, diasEnClase: 30, resueltos30: 2, conAyuda30: 2 }), []);
  assertEquals(alertasDe({ ...base, fallosFundamentos: 3 }), ['atascado-fundamentos']);
  // Recién llegado a la clase: solo cuenta el atasco en Fundamentos.
  assertEquals(alertasDe({ ...activo, diasEnClase: 5, temaAtascado: 'graphs', fallosFundamentos: 3 }), ['atascado-fundamentos']);
  // Una caída no se repite como meseta.
  assertEquals(alertasDe({ ...activo, nivelActual: 960, nivelHace14Dias: 1000 }), ['en-caida']);
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
