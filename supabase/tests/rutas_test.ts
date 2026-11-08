import { assert, assertEquals } from '@std/assert';
import { segmentosDe } from '../functions/_compartido/enrutado.ts';
import { VEREDICTOS } from '../functions/_compartido/skillEngine.ts';

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

/* ── Veredictos ─────────────────────────────────────────────────────────── */

Deno.test('PENDING no es un veredicto procesable', () => {
  assert(!VEREDICTOS.has('PENDING'));
  assert(VEREDICTOS.has('ACCEPTED'));
  assert(VEREDICTOS.has('WRONG_ANSWER'));
  assert(VEREDICTOS.has('COMPILATION_ERROR'));
});
