import { assertEquals } from '@std/assert';
import { bloquesDe, limpiarTexto, textoPlano } from '../../src/scripts/enunciado.js';

const IMG = 'https://espresso.codeforces.com/abc.png';
const p = (...hijos: unknown[]) => ({ tipo: 'p', hijos });

Deno.test('una formula va en linea y solo conserva el src', () => {
  const html = `Score is <img align="middle" class="tex-formula" src="${IMG}" style="max-width: 100.0%;"/> points.`;
  assertEquals(bloquesDe(html), [p('Score is ', { tipo: 'formula', src: IMG }, ' points.')]);
});

Deno.test('una figura parte el parrafo y queda en su propio bloque', () => {
  const html = `Before. <img class="tex-graphics" src="${IMG}" style="x"/> <img class="tex-graphics" src="${IMG}"/> After.`;
  assertEquals(bloquesDe(html), [
    p('Before.'),
    { tipo: 'figura', src: IMG },
    { tipo: 'figura', src: IMG },
    p('After.'),
  ]);
});

Deno.test('una imagen de otro dominio se queda como texto', () => {
  const html = 'See <img class="tex-formula" src="https://evil.example/x.png" onerror="alert(1)"/> here.';
  assertEquals(bloquesDe(html), [p(html)]);
});

Deno.test('sup y sub anidan su contenido y conservan los espacios vecinos', () => {
  const html = '*f*<sub class="lower-index">2</sub> = (10<sup class="upper-index">9</sup> + 7)';
  assertEquals(bloquesDe(html), [
    p('f', { tipo: 'sub', hijos: ['2'] }, ' = (10', { tipo: 'sup', hijos: ['9'] }, ' + 7)'),
  ]);
});

Deno.test('una etiqueta sin cerrar termina con el parrafo y un cierre suelto se ignora', () => {
  assertEquals(bloquesDe('a<sup>2\n\nb</sub> c'), [
    p('a', { tipo: 'sup', hijos: ['2'] }),
    p('b c'),
  ]);
});

Deno.test('ul y li forman lista; un li suelto tambien y un ul vacio no pinta nada', () => {
  assertEquals(bloquesDe('Steps: <ul><li>One</li><li>Two <sup>2</sup></li></ul> Done.'), [
    p('Steps:'),
    { tipo: 'lista', items: [['One'], ['Two ', { tipo: 'sup', hijos: ['2'] }]] },
    p('Done.'),
  ]);
  assertEquals(bloquesDe('- After 4. <li> At operation 5. <ul>'), [
    p('- After 4.'),
    { tipo: 'lista', items: [['At operation 5.']] },
  ]);
});

Deno.test('center forma un bloque centrado', () => {
  assertEquals(bloquesDe('Table is <center class="tex-equation">1 2 3 4</center> 1. Next'), [
    p('Table is'),
    { tipo: 'centro', hijos: ['1 2 3 4'] },
    p('1. Next'),
  ]);
});

Deno.test('una entidad nunca se vuelve etiqueta y lo que no esta en la lista es texto', () => {
  assertEquals(bloquesDe('&lt;sup&gt;x&lt;/sup&gt; and <b>bold</b> <script>alert(1)</script>'), [
    p('<sup>x</sup> and <b>bold</b> <script>alert(1)</script>'),
  ]);
});

Deno.test('el separador <= es un espacio fuera de las formulas', () => {
  assertEquals(
    limpiarTexto('*n* (1<=≤<=*n*<=≤<=200<=000), *i*<=&lt;<=*j*, *a**i*,<=*b**i*, 109<=+<=7'),
    'n (1 ≤ n ≤ 200 000), i < j, ai, bi, 109 + 7',
  );
  assertEquals(limpiarTexto('keep $a <= b$ and x &lt;= y'), 'keep $a <= b$ and x <= y');
  assertEquals(limpiarTexto('*dr*(<=*S*(*n*)<=)'), 'dr(S(n))');
});

Deno.test('el parrafo final "none" no se muestra', () => {
  assertEquals(bloquesDe('Uno.\n\nDos.\n\nnone'), [p('Uno.'), p('Dos.')]);
  assertEquals(bloquesDe('none'), [p('none')]);
});

Deno.test('textoPlano no arrastra etiquetas ni imagenes', () => {
  const html = `Area is <img class="tex-formula" src="${IMG}"/> or 10<sup>9</sup>.\n\n<ul><li>uno</li></ul>`;
  assertEquals(textoPlano(html), 'Area is or 109. uno');
});
