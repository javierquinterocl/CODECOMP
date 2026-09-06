import { assert, assertEquals } from '@std/assert';
import { segmentosDe } from '../functions/_compartido/enrutado.ts';
import { cambioDeRating, K, probabilidadEsperada, VEREDICTOS } from '../functions/_compartido/skillEngine.ts';

/* ── Enrutado ───────────────────────────────────────────────────────────── */

Deno.test('segmentosDe extrae la ruta despues del nombre de la funcion', () => {
  assertEquals(segmentosDe('/functions/v1/api/problems'), ['problems']);
  assertEquals(segmentosDe('/functions/v1/api/problems/4'), ['problems', '4']);
  assertEquals(segmentosDe('/functions/v1/api/judge0'), ['judge0']);
  assertEquals(segmentosDe('/functions/v1/api'), []);
  assertEquals(segmentosDe('/functions/v1/api/'), []);
});

Deno.test('segmentosDe tolera rutas sin el prefijo de Supabase', () => {
  // Asi se ve al servir localmente o detras de un proxy.
  assertEquals(segmentosDe('/api/progress'), ['progress']);
  assertEquals(segmentosDe('/progress'), ['progress']);
});

/* ── Elo ────────────────────────────────────────────────────────────────── */

Deno.test('un problema del mismo nivel da 50% de probabilidad', () => {
  assertEquals(probabilidadEsperada(1000, 1000), 0.5);
});

Deno.test('un problema mas dificil da menos probabilidad', () => {
  assert(probabilidadEsperada(1000, 1400) < 0.5);
  assert(probabilidadEsperada(1000, 600) > 0.5);
});

Deno.test('resolver algo de tu nivel da la mitad de K', () => {
  assertEquals(cambioDeRating(1000, 1000, true), K / 2);
});

Deno.test('resolver algo dificil da mas rating que algo facil', () => {
  const dificil = cambioDeRating(1000, 1600, true);
  const facil = cambioDeRating(1000, 800, true);
  assert(dificil > facil, `dificil=${dificil} deberia superar a facil=${facil}`);
  assert(dificil <= K);
  assert(facil >= 0);
});

Deno.test('sin primer acierto no hay cambio de rating', () => {
  assertEquals(cambioDeRating(1000, 1600, false), 0);
  assertEquals(cambioDeRating(1000, 800, false), 0);
});

Deno.test('el cambio de rating nunca se sale de [0, K]', () => {
  for (const rating of [0, 800, 1000, 1500, 2400, 3500]) {
    for (const dificultad of [800, 1200, 2000, 3500]) {
      const delta = cambioDeRating(rating, dificultad, true);
      assert(delta >= 0 && delta <= K, `rating=${rating} dif=${dificultad} delta=${delta}`);
    }
  }
});

/* ── Veredictos ─────────────────────────────────────────────────────────── */

Deno.test('PENDING no es un veredicto procesable', () => {
  assert(!VEREDICTOS.has('PENDING'));
  assert(VEREDICTOS.has('ACCEPTED'));
  assert(VEREDICTOS.has('WRONG_ANSWER'));
  assert(VEREDICTOS.has('COMPILATION_ERROR'));
});
