import { assertEquals } from '@std/assert';
import { primeraDiferencia, textoDeDiferencia } from '../../src/scripts/diferencia.js';

Deno.test('primeraDiferencia: senala la letra distinta', () => {
  const d = primeraDiferencia('Hola Mundo', 'Hola mundo');
  assertEquals(d, { tipo: 'letra', linea: 1, columna: 6, esperaba: 'M', escribiste: 'm' });
  assertEquals(textoDeDiferencia(d), 'Línea 1, letra 6: esperaba «M» y escribiste «m».');
});

Deno.test('primeraDiferencia: ignora espacios finales y lineas vacias al final', () => {
  assertEquals(primeraDiferencia('1\n2\n', '1  \r\n2\n\n\n'), null);
});

Deno.test('primeraDiferencia: lineas que faltan, sobran o terminan antes', () => {
  assertEquals(primeraDiferencia('1\n2\n3', '1\n2'), { tipo: 'falta', linea: 3 });
  assertEquals(primeraDiferencia('1', '1\n2'), { tipo: 'sobra', linea: 2 });
  const corta = primeraDiferencia('10 20', '10');
  assertEquals(corta as unknown, { tipo: 'letra', linea: 1, columna: 3, esperaba: ' ', escribiste: undefined });
  assertEquals(textoDeDiferencia(corta), 'Línea 1, letra 3: esperaba un espacio, pero tu línea termina ahí.');
});

Deno.test('textoDeDiferencia: sin diferencia visible da una frase generica', () => {
  assertEquals(textoDeDiferencia(null).startsWith('La diferencia está en espacios'), true);
});
