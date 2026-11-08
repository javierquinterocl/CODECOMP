import { assert, assertEquals, assertMatch } from '@std/assert';
import { abrir, cookieDe, llaveDe, sellar, setCookie } from '../functions/_compartido/sesion.ts';
import { cabecerasCors, origenConfiable } from '../functions/_compartido/http.ts';

// Llaves de prueba inventadas (32 bytes), nunca las de un .env.
const LLAVE = btoa(String.fromCharCode(...new Uint8Array(32).fill(7)));
const OTRA = btoa(String.fromCharCode(...new Uint8Array(32).fill(9)));
const identidad = { uid: 'u1', email: 'a@ejemplo.com', nombre: 'Ana', emailVerificado: true };

Deno.test('la cookie se sella y se abre con la misma llave', async () => {
  const llave = (await llaveDe(LLAVE))!;
  const valor = await sellar(identidad, llave);
  assertMatch(valor, /^[A-Za-z0-9_-]+$/);
  assertEquals(await abrir(valor, llave), identidad);
});

Deno.test('una cookie alterada, de otra llave o vencida no abre', async () => {
  const llave = (await llaveDe(LLAVE))!;
  const otra = (await llaveDe(OTRA))!;
  const valor = await sellar(identidad, llave, 0);
  assertEquals(await abrir(valor, otra), null);
  assertEquals(await abrir(valor.slice(0, -2) + (valor.endsWith('A') ? 'BB' : 'AA'), llave), null);
  assertEquals(await abrir(valor, llave, 8 * 60 * 60 * 1000 + 1), null);
  assertEquals(await abrir('basura', llave), null);
});

Deno.test('sin llave valida no hay cookie', async () => {
  assertEquals(await llaveDe(''), null);
  assertEquals(await llaveDe(btoa('corta')), null);
});

Deno.test('la cookie lleva __Host-, Secure, HttpOnly y SameSite', () => {
  const c = setCookie('x');
  assert(c.startsWith('__Host-cc_sesion=x;'));
  for (const parte of ['Path=/', 'Secure', 'HttpOnly', 'SameSite=Lax']) assert(c.includes(parte));
  assert(!c.includes('Domain'));
  const req = new Request('http://x', { headers: { cookie: 'otra=1; __Host-cc_sesion=abc=; y=2' } });
  assertEquals(cookieDe(req), 'abc=');
});

Deno.test('CORS con credenciales solo para origenes de la lista', () => {
  const lista = ['https://app.codecomp.online'];
  assertEquals(cabecerasCors('https://app.codecomp.online', lista)?.['Access-Control-Allow-Credentials'], 'true');
  assertEquals(cabecerasCors('https://malo.com', lista), null);
  assertEquals(cabecerasCors('https://x.com', [])?.['Access-Control-Allow-Credentials'], undefined);
  assertEquals(origenConfiable(null, lista), false);
  assertEquals(origenConfiable('https://app.codecomp.online', lista), true);
  assertEquals(origenConfiable('https://app.codecomp.online', []), false);
});
