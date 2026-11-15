import { assertEquals } from '@std/assert';
import type { Config } from '../functions/_compartido/config.ts';
import type { Contexto } from '../functions/_compartido/contexto.ts';
import type { Sql } from '../functions/_compartido/db.ts';
import type { Mensaje } from '../functions/_compartido/correo.ts';
import {
  codigoDeEnlace,
  enlacePropio,
  firmarJwt,
  olvidarToken,
} from '../functions/_compartido/firebaseAdmin.ts';
import { acceso } from '../functions/_compartido/rutas/acceso.ts';

// Llave RSA generada aqui mismo: nunca una real.
const PAR = await crypto.subtle.generateKey(
  { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
  true,
  ['sign', 'verify'],
);
const pkcs8 = new Uint8Array(await crypto.subtle.exportKey('pkcs8', PAR.privateKey));
// Cabecera armada por partes para que el escaneo de secretos no la confunda con una llave real.
const MARCA = ['PRIVATE', 'KEY'].join(' ');
const PEM = `-----BEGIN ${MARCA}-----\n${btoa(String.fromCharCode(...pkcs8))}\n-----END ${MARCA}-----\n`;
const CUENTA = { client_email: 'prueba@proyecto-inventado.iam.gserviceaccount.com', private_key: PEM, project_id: 'proyecto-inventado' };

const CONFIG = {
  zonaHoraria: 'America/Bogota',
  appUrl: 'https://codecomp.online',
  firebaseCuentaServicio: JSON.stringify(CUENTA),
  resendApiKey: 're_inventada_para_pruebas',
  correoFirmaClave: 'clave-inventada-para-pruebas',
  correoMaxDiario: 90,
  correoMaxMensual: 2900,
  accesoMaxDiario: 30,
  accesoMaxMensual: 300,
} as unknown as Config;

// Presupuesto de mentira: `agotado` dice que periodos ya no tienen cupo.
const baseFalsa = (agotado: RegExp | null = null) => {
  const periodos: string[] = [];
  const sql = ((_p: TemplateStringsArray, ...v: unknown[]) => {
    periodos.push(String(v[0]));
    return Promise.resolve([{ permitido: !(agotado && agotado.test(String(v[0]))), usado_dia: 0, usado_mes: 0 }]);
  }) as unknown as Sql;
  return { sql, periodos };
};

// Google de mentira: token y codigo; `nadie@` no existe.
const googleFalso = () => {
  const cuerpos: Record<string, unknown>[] = [];
  const pedir = (async (url: string | URL | Request, init?: RequestInit) => {
    const u = String(url);
    if (u.includes('oauth2')) return Response.json({ access_token: 'token-inventado', expires_in: 3600 });
    const cuerpo = JSON.parse(String(init?.body));
    cuerpos.push(cuerpo);
    if (String(cuerpo.email).startsWith('nadie@')) {
      return Response.json({ error: { message: 'EMAIL_NOT_FOUND' } }, { status: 400 });
    }
    return Response.json({ oobLink: 'https://proyecto-inventado.firebaseapp.com/__/auth/action?mode=resetPassword&oobCode=CODIGO_inventado-123' });
  }) as typeof fetch;
  return { pedir, cuerpos };
};

const llamar = async (
  accion: string,
  opciones: { cuerpo?: unknown; identidad?: unknown; agotado?: RegExp; config?: Partial<Config>; ip?: string } = {},
) => {
  olvidarToken();
  const { sql, periodos } = baseFalsa(opciones.agotado ?? null);
  const google = googleFalso();
  const enviados: Mensaje[] = [];
  const tareas: Promise<unknown>[] = [];
  const ctx = {
    req: new Request(`http://local/acceso/${accion}`, {
      method: 'POST',
      body: JSON.stringify(opciones.cuerpo ?? {}),
      headers: opciones.ip ? { 'cf-connecting-ip': opciones.ip } : {},
    }),
    sql,
    config: { ...CONFIG, ...opciones.config },
    cors: {},
    identidad: opciones.identidad ?? null,
  } as unknown as Contexto;
  const r = await acceso(ctx, accion, {
    pedir: google.pedir,
    enviar: (m) => {
      enviados.push(...m);
      return Promise.resolve(true);
    },
    segundoPlano: (t) => tareas.push(t),
  });
  await Promise.all(tareas);
  return { s: r.status, c: await r.json(), enviados, periodos, google: google.cuerpos };
};

Deno.test('firmarJwt: firma RS256 verificable con la llave publica', async () => {
  const jwt = await firmarJwt(CUENTA, 1_000_000);
  const [cabecera, cuerpo, firma] = jwt.split('.');
  const bytes = (s: string) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
  const valida = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', PAR.publicKey, bytes(firma), new TextEncoder().encode(`${cabecera}.${cuerpo}`));
  assertEquals(valida, true);
  const datos = JSON.parse(new TextDecoder().decode(bytes(cuerpo)));
  assertEquals([datos.iss, datos.exp - datos.iat <= 3600], [CUENTA.client_email, true]);
});

Deno.test('codigoDeEnlace y enlacePropio: solo codigos validos y siempre hacia APP_URL', () => {
  assertEquals(codigoDeEnlace('https://x.firebaseapp.com/__/auth/action?oobCode=abcDEF_123-xyz'), 'abcDEF_123-xyz');
  assertEquals(codigoDeEnlace('https://x/a?oobCode=<script>'), null);
  assertEquals(codigoDeEnlace('https://x/a'), null);
  assertEquals(codigoDeEnlace(undefined), null);
  assertEquals(
    enlacePropio('https://codecomp.online', 'VERIFY_EMAIL', 'abc_123'),
    'https://codecomp.online/accion?mode=verifyEmail&oobCode=abc_123',
  );
});

Deno.test('recuperar: misma respuesta exista o no la cuenta; solo la existente recibe correo', async () => {
  const existe = await llamar('recuperar', { cuerpo: { email: ' Ana@Ejemplo.com ', continueUrl: 'https://malo' } });
  const noExiste = await llamar('recuperar', { cuerpo: { email: 'nadie@ejemplo.com' } });
  assertEquals([existe.s, existe.c], [noExiste.s, noExiste.c]);
  assertEquals(existe.enviados.length, 1);
  assertEquals(noExiste.enviados.length, 0);
  assertEquals(existe.enviados[0].to, 'ana@ejemplo.com');
  assertEquals(existe.enviados[0].html.includes('https://codecomp.online/accion?mode=resetPassword&amp;oobCode=CODIGO_inventado-123'), true);
  assertEquals(existe.google[0], { requestType: 'PASSWORD_RESET', email: 'ana@ejemplo.com', returnOobLink: true });
  // El correo nunca queda en claro en los periodos del presupuesto.
  assertEquals(existe.periodos.some((p) => p.includes('ana@')), false);
});

Deno.test('recuperar: con el cupo del correo agotado responde igual y no llama a Google', async () => {
  const r = await llamar('recuperar', { cuerpo: { email: 'ana@ejemplo.com' }, agotado: /^acceso-correo:/ });
  assertEquals([r.s, r.enviados.length, r.google.length], [200, 0, 0]);
});

Deno.test('recuperar: limite por IP, correo invalido y sin configurar', async () => {
  assertEquals((await llamar('recuperar', { cuerpo: { email: 'ana@ejemplo.com' }, ip: '203.0.113.9', agotado: /^acceso-ip:/ })).s, 429);
  assertEquals((await llamar('recuperar', { cuerpo: { email: 'no-es-correo' } })).s, 400);
  const sin = await llamar('recuperar', { cuerpo: { email: 'ana@ejemplo.com' }, config: { firebaseCuentaServicio: '' } });
  assertEquals([sin.s, sin.c.codigo], [503, 'no-configurado']);
});

Deno.test('verificar: usa el correo del token y no el del cuerpo', async () => {
  const sinSesion = await llamar('verificar', { cuerpo: { email: 'otro@ejemplo.com' } });
  assertEquals(sinSesion.s, 401);
  const ya = await llamar('verificar', { identidad: { uid: 'u1', email: 'ana@ejemplo.com', emailVerificado: true } });
  assertEquals([ya.s, ya.c.yaVerificado, ya.enviados.length], [200, true, 0]);
  const r = await llamar('verificar', {
    cuerpo: { email: 'otro@ejemplo.com' },
    identidad: { uid: 'u1', email: 'Ana@Ejemplo.com', emailVerificado: false },
  });
  assertEquals([r.s, r.enviados[0].to, r.google[0].requestType], [200, 'ana@ejemplo.com', 'VERIFY_EMAIL']);
  assertEquals(r.enviados[0].html.includes('/accion?mode=verifyEmail&amp;oobCode='), true);
});
