import { assert, assertEquals } from '@std/assert';
import { enmascarar } from '../../scripts/copiar_catalogo.ts';

// Regresion: la primera version usaba new URL() y filtro contrasenas reales.

const CLAVE = 'qI8D9oV6gyldG3Ph';

Deno.test('enmascara la contrasena de una URL de Supabase', () => {
  const url =
    `postgresql://postgres.abcdef:${CLAVE}@aws-0-us-east-1.pooler.supabase.com:5432/postgres`;
  const salida = enmascarar(url);

  assert(!salida.includes(CLAVE), `la contrasena sigue visible: ${salida}`);
  assertEquals(
    salida,
    'postgresql://postgres.abcdef:***@aws-0-us-east-1.pooler.supabase.com:5432/postgres',
  );
});

Deno.test('funciona con los dos esquemas que acepta Postgres', () => {
  for (const esquema of ['postgresql', 'postgres']) {
    const salida = enmascarar(`${esquema}://usuario:${CLAVE}@host:5432/db`);
    assert(!salida.includes(CLAVE), `${esquema}: ${salida}`);
    assertEquals(salida, `${esquema}://usuario:***@host:5432/db`);
  }
});

Deno.test('no filtra nada con contrasenas de caracteres raros', () => {
  const raras = ['a/b+c=d', 'con.puntos', 'GUION-BAJO_1', '~tilde~', 'MAY123min'];
  for (const clave of raras) {
    const salida = enmascarar(`postgresql://user:${clave}@host:5432/db`);
    assert(!salida.includes(clave), `se filtro "${clave}": ${salida}`);
  }
});

Deno.test('ante una forma no reconocida no imprime la cadena', () => {
  for (const basura of ['', 'no-es-una-url', 'postgresql://sin-arroba', CLAVE]) {
    const salida = enmascarar(basura);
    assertEquals(salida, '<url no reconocida>');
    assert(!salida.includes(CLAVE));
  }
});

Deno.test('no deja pasar una URL sin contrasena como si estuviera enmascarada', () => {
  assertEquals(enmascarar('postgresql://host:5432/db'), '<url no reconocida>');
});
