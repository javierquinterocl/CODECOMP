import { assert, assertAlmostEquals, assertEquals } from '@std/assert';
import {
  calcularNivel,
  type Envio,
  esperado,
  factorK,
  NIVEL_INICIAL,
  pesoDeFallo,
  puntajeAceptado,
} from '../functions/_compartido/nivel.ts';

const DIA = 86_400_000;
const T0 = new Date('2026-11-01T12:00:00Z').getTime();
let contador = 0;
const envio = (
  problemaId: string,
  veredicto: string,
  minuto: number,
  { dificultad = 1000, codigo }: { dificultad?: number; codigo?: string } = {},
): Envio => ({
  id: `e${++contador}`,
  problemaId,
  veredicto,
  procesado: new Date(T0 + minuto * 60_000),
  hashCodigo: codigo ?? `c${contador}`,
  dificultad,
});

Deno.test('esperado y factorK siguen la formula aprobada', () => {
  assertEquals(esperado(1000, 1000), 0.5);
  assert(esperado(1000, 1400) < 0.5 && esperado(1000, 600) > 0.5);
  assertEquals(factorK(0), 80);
  assertEquals(factorK(10), 40);
  assertEquals(factorK(40), 16);
  assertEquals(factorK(500), 16);
});

Deno.test('peso de fallos y puntaje del aceptado', () => {
  assertEquals(pesoDeFallo('WRONG_ANSWER'), 1);
  assertEquals(pesoDeFallo('RUNTIME_ERROR'), 1);
  assertEquals(pesoDeFallo('TIME_LIMIT_EXCEEDED'), 0.5);
  assertEquals(pesoDeFallo('COMPILATION_ERROR'), 0);
  assertEquals(puntajeAceptado(0, false), 1);
  assertAlmostEquals(puntajeAceptado(2, false), 0.8);
  assertEquals(puntajeAceptado(9, false), 0.5);
  assertEquals(puntajeAceptado(0, true), 0.75);
});

Deno.test('aceptado al primer intento de un problema de su nivel sube K/2', () => {
  const { nivel, resultados } = calcularNivel([envio('p1', 'ACCEPTED', 0)], []);
  assertEquals(nivel, NIVEL_INICIAL + 40);
  assertEquals(resultados.length, 1);
  assertEquals(resultados[0].aceptado, true);
});

Deno.test('un aceptado nunca baja el nivel, aunque sea facil y con muchos fallos', () => {
  const envios = [
    ...[0, 1, 2, 3].map((m) => envio('facil', 'WRONG_ANSWER', m, { dificultad: 800 })),
    envio('facil', 'ACCEPTED', 4, { dificultad: 800 }),
  ];
  const { nivel } = calcularNivel(envios, []);
  assert(nivel >= NIVEL_INICIAL, `nivel=${nivel}`);
});

Deno.test('cinco fallos cierran el problema sin resolver y bajan el nivel', () => {
  const envios = [0, 1, 2, 3, 4].map((m) => envio('p', 'WRONG_ANSWER', m));
  const { nivel, resultados } = calcularNivel(envios, []);
  assertEquals(resultados[0].aceptado, false);
  assertEquals(resultados[0].puntaje, 0);
  assertEquals(nivel, NIVEL_INICIAL - 40);
  // Un aceptado despues ya no mueve el nivel.
  const despues = calcularNivel([...envios, envio('p', 'ACCEPTED', 10)], []);
  assertEquals(despues.nivel, nivel);
});

Deno.test('reenviar el mismo codigo, compilar mal o un error del juez no cuentan como fallo', () => {
  const envios = [
    ...[0, 1, 2, 3, 4, 5].map((m) => envio('p', 'WRONG_ANSWER', m, { codigo: 'igual' })),
    envio('p', 'COMPILATION_ERROR', 6),
    envio('p', 'ERROR_JUEZ', 7, { codigo: 'nuevo' }),
    envio('p', 'ACCEPTED', 8, { codigo: 'nuevo' }),
  ];
  const { resultados } = calcularNivel(envios, []);
  assertEquals(resultados[0].aceptado, true);
  assertAlmostEquals(resultados[0].puntaje, 0.9); // solo un fallo contado
});

Deno.test('el tiempo excedido cuenta medio fallo', () => {
  const envios = [
    envio('p', 'TIME_LIMIT_EXCEEDED', 0),
    envio('p', 'TIME_LIMIT_EXCEEDED', 1),
    envio('p', 'ACCEPTED', 2),
  ];
  assertAlmostEquals(calcularNivel(envios, []).resultados[0].puntaje, 0.9);
});

Deno.test('una pista antes del aceptado lo multiplica por 0,75; despues no', () => {
  const envios = [envio('p', 'ACCEPTED', 10)];
  const antes = calcularNivel(envios, [{ problemaId: 'p', creada: new Date(T0 + 5 * 60_000) }]);
  const despues = calcularNivel(envios, [{ problemaId: 'p', creada: new Date(T0 + 20 * 60_000) }]);
  assertEquals(antes.resultados[0].puntaje, 0.75);
  assertEquals(despues.resultados[0].puntaje, 1);
});

Deno.test('a los 7 dias del primer fallo sin aceptado el problema se cierra en el siguiente envio', () => {
  const fallo = envio('viejo', 'WRONG_ANSWER', 0);
  const pronto = calcularNivel([fallo, envio('otro', 'WRONG_ANSWER', 6 * 24 * 60)], []);
  assertEquals(pronto.resultados.length, 0);
  const tarde = calcularNivel([fallo, envio('otro', 'WRONG_ANSWER', 7 * 24 * 60)], []);
  assertEquals(tarde.resultados.length, 1);
  assertEquals(tarde.resultados[0].problemaId, 'viejo');
  assertEquals(tarde.resultados[0].envioId, null);
  assertEquals(tarde.resultados[0].cerradoEn.getTime(), T0 + 7 * DIA);
});

Deno.test('el resultado no depende del orden en que llegan los envios', () => {
  const envios = [
    envio('a', 'WRONG_ANSWER', 0),
    envio('b', 'ACCEPTED', 1, { dificultad: 1400 }),
    envio('a', 'ACCEPTED', 2),
  ];
  assertEquals(calcularNivel(envios, []).nivel, calcularNivel([...envios].reverse(), []).nivel);
});
