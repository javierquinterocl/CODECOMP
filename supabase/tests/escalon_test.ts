import { assertEquals } from '@std/assert';
import { escalonDe, escalonDeRating } from '../functions/_compartido/escalon.ts';

Deno.test('escalonDeRating usa los mismos cortes que nivelDeRating del frontend', () => {
  assertEquals(escalonDeRating(800), 1);
  assertEquals(escalonDeRating(1100), 1);
  assertEquals(escalonDeRating(1101), 2);
  assertEquals(escalonDeRating(1500), 2);
  assertEquals(escalonDeRating(1900), 3);
  assertEquals(escalonDeRating(2300), 4);
  assertEquals(escalonDeRating(3500), 5);
});

Deno.test('todos empiezan en el escalon 1 y suben por nivel real', () => {
  assertEquals(escalonDe(1000, {}).actual, 1);
  assertEquals(escalonDe(1000, {}).nivelParaSubir, 1101);
  assertEquals(escalonDe(1120, {}).actual, 2);
});

Deno.test('5 resueltos de un escalon abren el siguiente, en cadena', () => {
  assertEquals(escalonDe(1000, { 1: 4 }).actual, 1);
  assertEquals(escalonDe(1000, { 1: 5 }).actual, 2);
  assertEquals(escalonDe(1000, { 1: 5, 2: 5 }).actual, 3);
  // Resolver muchos de un escalon alto no salta los de abajo.
  assertEquals(escalonDe(1000, { 3: 9 }).actual, 1);
  assertEquals(escalonDe(1000, { 1: 7, 2: 2 }).resueltosEnActual, 2);
});

Deno.test('el minimo del docente sube el escalon pero no lo baja', () => {
  assertEquals(escalonDe(1000, {}, 3).actual, 3);
  assertEquals(escalonDe(1700, {}, 1).actual, 3);
  assertEquals(escalonDe(1000, {}, 9).actual, 5);
  assertEquals(escalonDe(2400, {}).nivelParaSubir, null);
});
