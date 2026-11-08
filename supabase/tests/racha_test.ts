import { assertEquals } from '@std/assert';
import { rachaDe } from '../functions/_compartido/racha.ts';

Deno.test('sin envios la racha es 0', () => {
  assertEquals(rachaDe([], '2026-11-08'), 0);
});

Deno.test('cuenta dias seguidos hasta hoy', () => {
  assertEquals(rachaDe(['2026-11-06', '2026-11-07', '2026-11-08'], '2026-11-08'), 3);
});

Deno.test('si hoy aun no hay envio, sigue viva desde ayer', () => {
  assertEquals(rachaDe(['2026-11-06', '2026-11-07'], '2026-11-08'), 2);
});

Deno.test('un dia sin envios la rompe', () => {
  assertEquals(rachaDe(['2026-11-05', '2026-11-06'], '2026-11-08'), 0);
  assertEquals(rachaDe(['2026-11-04', '2026-11-06', '2026-11-07', '2026-11-08'], '2026-11-08'), 3);
});

Deno.test('cruza meses y años, e ignora repetidos y el orden', () => {
  assertEquals(rachaDe(['2026-01-01', '2025-12-31', '2026-01-01', '2025-12-30'], '2026-01-01'), 3);
  assertEquals(rachaDe(['2026-03-01', '2026-02-28'], '2026-03-01'), 2);
});
