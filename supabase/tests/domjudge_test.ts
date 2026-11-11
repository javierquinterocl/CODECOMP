import { assertEquals } from 'jsr:@std/assert';
import {
  type ConcursoDJ,
  elegirConcurso,
  estadoDe,
  segundosDe,
  veredictosPorEnvio,
} from '../functions/_compartido/domjudge.ts';

const T = (iso: string) => Date.parse(iso);
const c = (id: string, inicio: string, fin: string): ConcursoDJ => ({
  id,
  name: id,
  start_time: inicio,
  end_time: fin,
});

Deno.test('elegirConcurso prefiere el que esta en curso', () => {
  const lista = [
    c('viejo', '2026-11-01T10:00:00Z', '2026-11-01T15:00:00Z'),
    c('hoy', '2026-11-09T14:00:00Z', '2026-11-09T17:00:00Z'),
    c('luego', '2026-11-20T14:00:00Z', '2026-11-20T17:00:00Z'),
  ];
  assertEquals(elegirConcurso(lista, T('2026-11-09T15:00:00Z'))?.id, 'hoy');
  assertEquals(elegirConcurso(lista, T('2026-11-09T12:00:00Z'))?.id, 'hoy');
  assertEquals(elegirConcurso(lista, T('2026-11-25T12:00:00Z'))?.id, 'luego');
  assertEquals(elegirConcurso([], T('2026-11-25T12:00:00Z')), null);
});

Deno.test('elegirConcurso ignora concursos sin fechas', () => {
  const lista = [{ id: 'x', name: 'x', start_time: null, end_time: null }];
  assertEquals(elegirConcurso(lista, T('2026-11-09T12:00:00Z')), null);
});

Deno.test('estadoDe marca antes, en curso y terminado', () => {
  const k = c('k', '2026-11-09T14:00:00Z', '2026-11-09T17:00:00Z');
  assertEquals(estadoDe(k, T('2026-11-09T13:59:59Z')), 'antes');
  assertEquals(estadoDe(k, T('2026-11-09T14:00:00Z')), 'en-curso');
  assertEquals(estadoDe(k, T('2026-11-09T17:00:00Z')), 'terminado');
});

Deno.test('segundosDe lee la duracion de DOMjudge', () => {
  assertEquals(segundosDe('1:00:00.000'), 3600);
  assertEquals(segundosDe('0:30:15'), 1815);
  assertEquals(segundosDe(null), 0);
});

Deno.test('veredictosPorEnvio toma el ultimo juicio valido', () => {
  const v = veredictosPorEnvio([
    { id: '1', submission_id: '10', judgement_type_id: 'WA' },
    { id: '5', submission_id: '10', judgement_type_id: 'AC' },
    { id: '6', submission_id: '10', judgement_type_id: 'TLE', valid: false },
    { id: '2', submission_id: '11', judgement_type_id: null },
  ]);
  assertEquals(v.get('10'), 'AC');
  assertEquals(v.get('11'), 'pendiente');
  assertEquals(v.get('12'), undefined);
});
