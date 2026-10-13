import { assertEquals } from '@std/assert';
import {
  entreComillas,
  escribirLote,
  leerLote,
  type Problema,
  protegidos,
  validar,
} from '../../scripts/traduccion/formato.ts';

const problema = (enunciado: string, extra: Partial<Problema> = {}): Problema => ({
  numero: 1,
  literales: [],
  titulo: 'Titulo',
  enunciado,
  ...extra,
});

/* ── Formato de lote ───────────────────────────────────────────────────── */

Deno.test('leerLote recupera lo que escribirLote guarda', () => {
  const lote = [
    problema('Uno.\n\nDos con $a \\le b$.', { numero: 7, md5: 'abc', literales: ['yes', 'no'] }),
    problema('Otro *n*.', { numero: 8, titulo: 'Segundo' }),
  ];
  assertEquals(leerLote(escribirLote(lote)), lote);
});

Deno.test('leerLote acepta saltos de linea de Windows y texto antes de la primera cabecera', () => {
  const texto = 'ruido\r\n@@@ PROBLEMA 3 @@@\r\nTITULO: Hola\r\nENUNCIADO:\r\nUno.\r\n\r\nDos.\r\n';
  assertEquals(leerLote(texto), [problema('Uno.\n\nDos.', { numero: 3, titulo: 'Hola' })]);
});

/* ── Segmentos protegidos ──────────────────────────────────────────────── */

Deno.test('protegidos separa formulas, variables, operadores y numeros', () => {
  const p = protegidos('Given *n* (1<=≤<=*n*<=≤<=10) and $x \\le 5$, print 12 = 2<sup>2</sup> &lt; 20.');
  assertEquals(p.formula, ['$x \\le 5$']);
  assertEquals(p.variable, ['*n*', '*n*']);
  assertEquals(p.etiqueta, ['<sup>', '</sup>']);
  assertEquals(p.entidad, ['&lt;']);
  assertEquals(p.operador, ['<=', '≤', '<=', '<=', '≤', '<=', '=']);
  assertEquals(p.numero, ['1', '10', '12', '2', '2', '20']);
});

Deno.test('un asterisco suelto o un sufijo ordinal no cuentan como variable', () => {
  const p = protegidos('The *i*-*th* toast needs 4 * 5 = 20 ml and 10 * 2 slices of *x*.');
  assertEquals(p.variable, ['*i*', '*x*']);
});

Deno.test('entreComillas reconoce comillas rectas, tipograficas y angulares', () => {
  assertEquals(entreComillas('Print "YES", “NO” o «Impossible».'), ['YES', 'NO', 'Impossible']);
});

Deno.test('entreComillas ignora las comillas de los atributos HTML', () => {
  assertEquals(entreComillas('Disk <img align="middle" src="a.png"/> then "NO" <img src="b.png"/>.'), [
    'NO',
  ]);
});

/* ── Validacion ────────────────────────────────────────────────────────── */

const EN = problema(
  'Given *n* (1<=≤<=*n*<=≤<=100).\n\nPrint "YES" if $n$ is a "lucky" number, otherwise "no".',
  { literales: ['no'] },
);

Deno.test('una traduccion fiel pasa sin errores', () => {
  const es = problema(
    'Dado *n* (1<=≤<=*n*<=≤<=100).\n\nImprime "YES" si $n$ es un número "lucky", si no "no".',
  );
  assertEquals(validar(EN, es), { errores: [], avisos: [] });
});

Deno.test('traducir una palabra corriente entre comillas solo avisa', () => {
  const es = problema(
    'Dado *n* (1<=≤<=*n*<=≤<=100).\n\nImprime "YES" si $n$ es un número "afortunado", si no "no".',
  );
  assertEquals(validar(EN, es), { errores: [], avisos: ['comillas traducidas: "lucky"'] });
});

Deno.test('traducir un literal de salida es un error, tambien si va en minusculas', () => {
  const es = problema(
    'Dado *n* (1<=≤<=*n*<=≤<=100).\n\nImprime "SÍ" si $n$ es un número "lucky", si no "no hay".',
  );
  assertEquals(validar(EN, es).errores, ['literal: faltan "YES"  "no"']);
});

Deno.test('un dialogo entre comillas se puede traducir; una palabra con mayuscula no', () => {
  const en = problema('He said "Piece of cake" and printed "Impossible".');
  const es = problema('Dijo "Pan comido" e imprimió "Imposible".');
  assertEquals(validar(en, es), {
    errores: ['literal: faltan "Impossible"'],
    avisos: ['comillas traducidas: "Piece of cake"'],
  });
});

Deno.test('detecta formulas, variables, numeros y parrafos cambiados', () => {
  const es = problema('Dado n (1<=≤<=*n*<=≤<=1.000). Imprime "YES" si $m$ es "lucky", si no "no".');
  assertEquals(validar(EN, es).errores, [
    'formula: faltan $n$',
    'formula: sobran $m$',
    'variable: faltan *n*',
    'numero: faltan 100',
    'numero: sobran 1.000',
    'parrafos: 2 en ingles, 1 en espanol',
  ]);
});

Deno.test('rechaza lo que falta, lo vacio y lo que sigue en ingles', () => {
  assertEquals(validar(EN, undefined).errores, ['sin traduccion']);
  assertEquals(validar(EN, problema('', { titulo: '' })).errores.slice(0, 2), [
    'titulo vacio',
    'enunciado vacio',
  ]);
  assertEquals(validar(EN, problema(EN.enunciado)).errores, ['el enunciado sigue en ingles']);
});
