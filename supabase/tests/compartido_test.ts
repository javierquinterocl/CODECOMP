import { assert, assertEquals, assertFalse } from '@std/assert';
import { dia, mes } from '../functions/_compartido/config.ts';
import { cabecerasCors, rechazo, responder, tokenDe } from '../functions/_compartido/http.ts';
import { hashDe, pesaMas, recortar, validarEnvio } from '../functions/_compartido/validacion.ts';
import { cabeceras, urlDeEnvio, veredictoDe } from '../functions/_compartido/judge0.ts';
import { mensajeDeLimite } from '../functions/_compartido/limites.ts';
import { emailDe, usernameDe } from '../functions/_compartido/auth.ts';

const OPC = {
  maxCodigoBytes: 64 * 1024,
  maxEntradaBytes: 64 * 1024,
  lenguajesPermitidos: new Set([51, 54, 62, 63, 68, 71]),
};

/* ── Zona horaria ──────────────────────────────────────────────────────── */

Deno.test('dia() usa la zona horaria del proyecto, no UTC', () => {
  // 2026-09-06 02:00 UTC = 2026-09-05 21:00 en Bogota (UTC-5).
  const instante = new Date('2026-09-06T02:00:00Z');
  assertEquals(dia('America/Bogota', instante), '2026-09-05');
  assertEquals(dia('UTC', instante), '2026-09-06');
});

Deno.test('mes() recorta el dia', () => {
  assertEquals(mes('America/Bogota', new Date('2026-09-06T02:00:00Z')), '2026-09');
});

Deno.test('el corte mensual tambien respeta la zona horaria', () => {
  // 2026-10-01 03:00 UTC sigue siendo septiembre en Bogota.
  const instante = new Date('2026-10-01T03:00:00Z');
  assertEquals(mes('America/Bogota', instante), '2026-09');
  assertEquals(mes('UTC', instante), '2026-10');
});

/* ── CORS ───────────────────────────────────────────────────────────────── */

Deno.test('sin allowlist se permite cualquier origen', () => {
  const c = cabecerasCors('https://loquesea.com', []);
  assert(c);
  assertEquals(c['Access-Control-Allow-Origin'], 'https://loquesea.com');
});

Deno.test('con allowlist se acepta el origen listado', () => {
  const c = cabecerasCors('https://codecomp.web.app', ['https://codecomp.web.app']);
  assert(c);
  assertEquals(c['Access-Control-Allow-Origin'], 'https://codecomp.web.app');
  assertEquals(c['Vary'], 'Origin');
});

Deno.test('con allowlist se rechaza un origen ajeno', () => {
  assertEquals(cabecerasCors('https://sitio-malo.com', ['https://codecomp.web.app']), null);
});

Deno.test('una peticion sin Origin pasa: CORS solo protege al navegador', () => {
  assert(cabecerasCors(null, ['https://codecomp.web.app']));
});

/* ── Bearer ─────────────────────────────────────────────────────────────── */

Deno.test('tokenDe extrae solo un Bearer bien formado', () => {
  const con = (v: string | null) =>
    new Request('http://x', { headers: v ? { authorization: v } : {} });
  assertEquals(tokenDe(con('Bearer abc123')), 'abc123');
  assertEquals(tokenDe(con('bearer abc123')), null);
  assertEquals(tokenDe(con('Basic abc123')), null);
  assertEquals(tokenDe(con('Bearer')), null);
  assertEquals(tokenDe(con(null)), null);
});

/* ── Respuestas ─────────────────────────────────────────────────────────── */

Deno.test('responder pone Retry-After solo si hay espera', async () => {
  const conEspera = responder(rechazo(429, 'limite-espera', 'Espera.', { reintentarEn: 7 }));
  assertEquals(conEspera.status, 429);
  assertEquals(conEspera.headers.get('Retry-After'), '7');
  assertEquals((await conEspera.json()).codigo, 'limite-espera');

  const sinEspera = responder(rechazo(400, 'lenguaje', 'No soportado.'));
  assertEquals(sinEspera.headers.get('Retry-After'), null);
  await sinEspera.body?.cancel();
});

/* ── Validacion de envios ───────────────────────────────────────────────── */

Deno.test('rechaza codigo vacio o ausente', () => {
  for (const cuerpo of [null, {}, { source_code: '   ' }, { source_code: 123 }]) {
    const r = validarEnvio(cuerpo, OPC);
    assertFalse(r.ok);
    if (!r.ok) assertEquals(r.rechazo.cuerpo.codigo, 'sin-codigo');
  }
});

Deno.test('rechaza lenguaje no permitido', () => {
  const r = validarEnvio({ source_code: 'x', language_id: 99 }, OPC);
  assertFalse(r.ok);
  if (!r.ok) assertEquals(r.rechazo.status, 400);
});

Deno.test('rechaza language_id no entero', () => {
  for (const id of [undefined, '71', 71.5, null]) {
    const r = validarEnvio({ source_code: 'x', language_id: id }, OPC);
    assertFalse(r.ok);
  }
});

Deno.test('rechaza codigo mayor al tope con 413', () => {
  const r = validarEnvio({ source_code: 'a'.repeat(70000), language_id: 71 }, OPC);
  assertFalse(r.ok);
  if (!r.ok) {
    assertEquals(r.rechazo.status, 413);
    assertEquals(r.rechazo.cuerpo.codigo, 'codigo-muy-largo');
  }
});

Deno.test('rechaza stdin mayor al tope', () => {
  const r = validarEnvio({ source_code: 'x', language_id: 71, stdin: 'a'.repeat(70000) }, OPC);
  assertFalse(r.ok);
  if (!r.ok) assertEquals(r.rechazo.cuerpo.codigo, 'entrada-muy-larga');
});

Deno.test('acepta un envio valido y normaliza los opcionales', () => {
  const r = validarEnvio(
    { source_code: 'print(1)', language_id: 71, problema_numero: 4, lenguaje: 'python' },
    OPC,
  );
  assert(r.ok);
  if (r.ok) {
    assertEquals(r.envio.sourceCode, 'print(1)');
    assertEquals(r.envio.entrada, '');
    assertEquals(r.envio.expectedOutput, null);
    assertEquals(r.envio.problemaNumero, 4);
    assertEquals(r.envio.lenguajeSlug, 'python');
  }
});

Deno.test('el tope se mide en bytes, no en caracteres', () => {
  // La n con tilde ocupa 2 bytes en UTF-8.
  assertEquals(pesaMas('n'.repeat(10), 10), false);
  assertEquals(pesaMas('ñ'.repeat(10), 10), true);
});

Deno.test('recortar limita la salida guardada', () => {
  assertEquals(recortar('hola'), 'hola');
  assertEquals(recortar(undefined), '');
  assertEquals(recortar(42), '');
  assert(recortar('a'.repeat(20000)).endsWith('...(recortado)'));
  assert(recortar('a'.repeat(20000)).length < 20000);
});

Deno.test('hashDe produce sha256 en hex', async () => {
  assertEquals(
    await hashDe('abc'),
    'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
  );
});

/* ── Judge0 ─────────────────────────────────────────────────────────────── */

Deno.test('veredictoDe traduce los status de Judge0', () => {
  assertEquals(veredictoDe(3), 'ACCEPTED');
  assertEquals(veredictoDe(4), 'WRONG_ANSWER');
  assertEquals(veredictoDe(5), 'TIME_LIMIT_EXCEEDED');
  assertEquals(veredictoDe(6), 'COMPILATION_ERROR');
  assertEquals(veredictoDe(7), 'RUNTIME_ERROR');
  assertEquals(veredictoDe(11), 'RUNTIME_ERROR');
  assertEquals(veredictoDe(undefined), 'RUNTIME_ERROR');
});

Deno.test('urlDeEnvio no duplica la barra final', () => {
  const esperado = 'https://j.com/submissions?base64_encoded=false&wait=true';
  assertEquals(urlDeEnvio('https://j.com'), esperado);
  assertEquals(urlDeEnvio('https://j.com/'), esperado);
});

Deno.test('cabeceras cambian entre rapidapi y judge0 propio', () => {
  const base = {
    judge0Url: 'https://judge0-ce.p.rapidapi.com',
    rapidApiKey: 'clave',
    judge0Token: 'token',
  };
  // deno-lint-ignore no-explicit-any
  const rapid = cabeceras({ ...base, modo: 'rapidapi' } as any);
  assertEquals(rapid['X-RapidAPI-Key'], 'clave');
  assertEquals(rapid['X-RapidAPI-Host'], 'judge0-ce.p.rapidapi.com');
  assertEquals(rapid['X-Auth-Token'], undefined);

  // deno-lint-ignore no-explicit-any
  const directo = cabeceras({ ...base, modo: 'directo' } as any);
  assertEquals(directo['X-Auth-Token'], 'token');
  assertEquals(directo['X-RapidAPI-Key'], undefined);
});

/* ── Mensajes de limite ─────────────────────────────────────────────────── */

Deno.test('cada codigo de limite tiene su mensaje', () => {
  assert(mensajeDeLimite('limite-espera', { esperaSegundos: 7 }).includes('7'));
  assert(mensajeDeLimite('limite-diario', { topeDiario: 100 }).includes('100'));
  assert(mensajeDeLimite('presupuesto-diario').length > 0);
  assert(mensajeDeLimite('presupuesto-mensual').length > 0);
  assert(mensajeDeLimite('desconocido').length > 0);
});

/* ── Identidad ──────────────────────────────────────────────────────────── */

Deno.test('usernameDe conserva el criterio de functions/index.js', () => {
  assertEquals(
    usernameDe({ uid: 'abcdefghij1234567', email: null, nombre: 'Javier Quintero' }),
    'JavierQuintero-1234567',
  );
  assertEquals(
    usernameDe({ uid: 'abcdefghij1234567', email: null, nombre: null }),
    'student-1234567',
  );
});

Deno.test('emailDe inventa uno estable si el token no lo trae', () => {
  assertEquals(emailDe({ uid: 'u1', email: 'a@b.com', nombre: null }), 'a@b.com');
  assertEquals(emailDe({ uid: 'u1', email: null, nombre: null }), 'u1@firebase.local');
});
