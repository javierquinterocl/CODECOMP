import { assertEquals } from '@std/assert';
import type { Config } from '../functions/_compartido/config.ts';
import type { Contexto } from '../functions/_compartido/contexto.ts';
import type { Sql } from '../functions/_compartido/db.ts';
import { rechazoDeCuenta, sesionVigente } from '../functions/_compartido/cuenta.ts';
import { rachaMaxima } from '../functions/_compartido/racha.ts';
import { logrosDe } from '../functions/_compartido/logros.ts';
import { cuenta, fotoValida, MAX_FOTO } from '../functions/_compartido/rutas/cuenta.ts';

const USUARIO = '11111111-2222-4333-8444-555555555555';
const OTRO = '99999999-2222-4333-8444-555555555555';
const SOLICITUD = '33333333-4444-4555-8666-777777777777';
const CONFIG = { zonaHoraria: 'America/Bogota', docentes: new Set(['docente@ejemplo.co']) } as unknown as Config;

interface Consulta { texto: string; valores: unknown[] }

// Base de mentira: responde con la primera regla cuyo patron aparece; sql.begin usa la misma.
const baseFalsa = (reglas: [RegExp, (v: unknown[]) => unknown[]][] = []) => {
  const consultas: Consulta[] = [];
  const consultar = (partes: TemplateStringsArray, ...valores: unknown[]) => {
    const texto = partes.join('?');
    consultas.push({ texto, valores });
    const regla = reglas.find(([patron]) => patron.test(texto));
    return Promise.resolve(regla ? regla[1](valores) : []);
  };
  const sql = Object.assign(consultar, {
    begin: (fn: (tx: unknown) => Promise<unknown>) => fn(consultar),
  }) as unknown as Sql;
  return { sql, consultas };
};

const conUsuario = (reglas: [RegExp, (v: unknown[]) => unknown[]][] = [], id = USUARIO) =>
  baseFalsa([[/FROM users WHERE firebase_uid/, () => [{ id, email: 'x@ejemplo.co', correo_verificado: true }]], ...reglas]);

const ctx = (sql: Sql, metodo: string, ruta: string, opciones: { cuerpo?: BodyInit; headers?: Record<string, string>; email?: string } = {}) =>
  ({
    req: new Request(`http://local/${ruta}`, { method: metodo, body: opciones.cuerpo, headers: opciones.headers }),
    url: new URL(`http://local/${ruta}`),
    sql,
    config: CONFIG,
    cors: {},
    identidad: { uid: 'firebase-1', email: opciones.email ?? 'estudiante@ejemplo.co', emailVerificado: true },
  }) as unknown as Contexto;

const segmentos = (ruta: string) => ruta.split('?')[0].split('/').slice(1);
const llamar = async (sql: Sql, metodo: string, ruta: string, opciones = {}) => {
  const r = await cuenta(ctx(sql, metodo, ruta, opciones), segmentos(ruta));
  const tipo = r.headers.get('Content-Type') ?? '';
  return { s: r.status, c: tipo.includes('json') ? await r.json() : null, r };
};

/* ── Sesiones ──────────────────────────────────────────────────────────── */

Deno.test('sesionVigente compara auth_time en segundos con el cierre truncado al segundo', () => {
  const cierre = new Date('2026-11-14T10:00:00Z');
  assertEquals(sesionVigente(undefined, null), true);
  assertEquals(sesionVigente(cierre.getTime() / 1000 - 1, cierre), false);
  assertEquals(sesionVigente(cierre.getTime() / 1000, cierre), true); // mismo segundo: entro de nuevo
  assertEquals(sesionVigente(cierre.getTime() / 1000 + 60, cierre), true);
  assertEquals(sesionVigente(undefined, cierre), false); // cookie vieja sin auth_time
});

Deno.test('rechazoDeCuenta: cuenta eliminada, sesion cerrada o nada; si falla la consulta deja pasar', async () => {
  const id = { uid: 'u', email: null, nombre: null, authTime: 1000 };
  const con = (fila: unknown) => baseFalsa([[/sesiones_desde/, () => [fila]]]).sql;
  assertEquals(await rechazoDeCuenta(con({ eliminada: true, sesiones_desde: null }), id), 'cuenta-eliminada');
  assertEquals(await rechazoDeCuenta(con({ eliminada: false, sesiones_desde: new Date(2_000_000) }), id), 'sesion-cerrada');
  assertEquals(await rechazoDeCuenta(con({ eliminada: false, sesiones_desde: null }), id), null);
  const rota = (() => Promise.reject(new Error('sin base'))) as unknown as Sql;
  assertEquals(await rechazoDeCuenta(rota, id), null);
});

/* ── Logros ────────────────────────────────────────────────────────────── */

Deno.test('rachaMaxima encuentra la racha mas larga, tambien en el cambio de anio', () => {
  assertEquals(rachaMaxima([]), 0);
  assertEquals(rachaMaxima(['2026-01-05']), 1);
  assertEquals(rachaMaxima(['2025-12-30', '2025-12-31', '2026-01-01', '2026-01-03', '2026-01-04']), 3);
  assertEquals(rachaMaxima(['2026-03-02', '2026-03-01', '2026-03-01']), 2);
});

const base = {
  resueltos: 0,
  rachaMaxima: 0,
  escalonMerito: 1,
  fundamentos: { hechos: 0, total: 50 },
  practica: { hechos: 0, total: 50 },
  competenciasEmpezadas: 0,
};

Deno.test('logrosDe marca conseguidos y limita el avance a la meta', () => {
  const l = Object.fromEntries(logrosDe({ ...base, resueltos: 12, rachaMaxima: 8, escalonMerito: 3 }).map((x) => [x.id, x]));
  assertEquals(l['primer-paso'].conseguido, true);
  assertEquals(l['en-marcha'], { id: 'en-marcha', actual: 10, meta: 10, conseguido: true });
  assertEquals(l['medio-centenar'].actual, 12);
  assertEquals(l['constancia'].conseguido, true);
  assertEquals(l['imparable'].conseguido, false);
  assertEquals(l['escalador'].conseguido, true);
  assertEquals(l['cima'].conseguido, false);
});

Deno.test('los completos se cuentan contra el catalogo, y un nivel vacio no se completa', () => {
  const l = Object.fromEntries(logrosDe({ ...base, fundamentos: { hechos: 3, total: 3 }, practica: { hechos: 0, total: 0 } }).map((x) => [x.id, x]));
  assertEquals(l['fundamentos'].conseguido, true);
  assertEquals(l['practica'].conseguido, false);
});

/* ── Foto ──────────────────────────────────────────────────────────────── */

const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4]);

Deno.test('fotoValida solo acepta JPEG de hasta 60 KB', () => {
  assertEquals(fotoValida(JPEG), true);
  assertEquals(fotoValida(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2])), false); // PNG
  assertEquals(fotoValida(new Uint8Array()), false);
  const grande = new Uint8Array(MAX_FOTO + 1);
  grande.set([0xff, 0xd8, 0xff]);
  assertEquals(fotoValida(grande), false);
});

Deno.test('subir foto exige consentimiento, tamano y formato', async () => {
  const { sql, consultas } = conUsuario([[/INSERT INTO foto_usuario/, () => [{ actualizada_en: new Date(5000) }]]]);
  assertEquals((await llamar(sql, 'POST', 'cuenta/foto', { cuerpo: JPEG })).s, 400);
  assertEquals((await llamar(sql, 'POST', 'cuenta/foto?consentimiento=1', { cuerpo: new Uint8Array([1, 2, 3, 4]) })).s, 400);
  assertEquals((await llamar(sql, 'POST', 'cuenta/foto?consentimiento=1', { cuerpo: JPEG, headers: { 'content-length': String(MAX_FOTO + 1) } })).s, 413);
  const bien = await llamar(sql, 'POST', 'cuenta/foto?consentimiento=1', { cuerpo: JPEG });
  assertEquals(bien.s, 200);
  assertEquals(bien.c.fotoVersion, 5000);
  assertEquals(consultas.filter((c) => c.texto.includes('INSERT INTO foto_usuario')).length, 1);
});

Deno.test('la foto la ven el propio usuario y su docente, con cabeceras seguras', async () => {
  const sinPermiso = conUsuario([[/FROM foto_usuario f/, () => []]]);
  assertEquals((await llamar(sinPermiso.sql, 'GET', `cuenta/foto/${OTRO}`)).s, 404);
  const consulta = sinPermiso.consultas.find((c) => c.texto.includes('FROM foto_usuario f'))!.texto;
  assertEquals(consulta.includes('c.docente_id = ?'), true);
  assertEquals((await llamar(sinPermiso.sql, 'GET', 'cuenta/foto/no-es-uuid')).s, 400);

  const conPermiso = conUsuario([[/FROM foto_usuario f/, () => [{ datos: JPEG }]]]);
  const r = (await llamar(conPermiso.sql, 'GET', `cuenta/foto/${USUARIO}`)).r;
  assertEquals(r.status, 200);
  assertEquals(r.headers.get('Content-Type'), 'image/jpeg');
  assertEquals(r.headers.get('X-Content-Type-Options'), 'nosniff');
  assertEquals(r.headers.get('Content-Security-Policy'), "default-src 'none'");
});

/* ── Mis datos ─────────────────────────────────────────────────────────── */

Deno.test('Mis datos no incluye columnas internas y todo va filtrado por el usuario', async () => {
  const { sql, consultas } = conUsuario([[/FROM users WHERE id/, () => [{ username: 'u' }]]]);
  const r = await llamar(sql, 'GET', 'cuenta/datos');
  assertEquals(r.s, 200);
  const todas = consultas.map((c) => c.texto).join('\n');
  for (const prohibido of ['judge0_token', 'casos_ocultos', 'solucion_referencia', 'SELECT *', 'firebase_uid, email FROM users']) {
    assertEquals(todas.includes(prohibido), false, prohibido);
  }
  // Cada consulta de datos lleva el id del usuario como parametro.
  const deDatos = consultas.slice(1);
  assertEquals(deDatos.every((c) => c.valores.includes(USUARIO)), true);
  assertEquals(Object.keys(r.c).includes('accesos_de_docentes'), true);
});

/* ── Borrado ───────────────────────────────────────────────────────────── */

Deno.test('un docente no puede pedir el borrado de su cuenta', async () => {
  const { sql, consultas } = conUsuario();
  const r = await llamar(sql, 'POST', 'cuenta/borrado', { email: 'docente@ejemplo.co' });
  assertEquals(r.s, 403);
  assertEquals(consultas.some((c) => c.texto.includes('INSERT INTO solicitudes_borrado')), false);
});

Deno.test('pedir borrado crea una sola solicitud y avisa a los docentes sin datos personales', async () => {
  let datosAviso: unknown;
  const { sql } = conUsuario([
    [/INSERT INTO solicitudes_borrado/, () => [{ id: SOLICITUD, creada_en: new Date() }]],
    [/FROM users WHERE lower\(email\)/, () => [{ id: 'docente-id' }]],
    [/INSERT INTO notificaciones/, (v) => { datosAviso = JSON.parse((v[3] as string[])[0]); return []; }],
  ]);
  const r = await llamar(sql, 'POST', 'cuenta/borrado');
  assertEquals(r.s, 201);
  assertEquals(datosAviso, { solicitud: SOLICITUD });

  const repetida = conUsuario([[/INSERT INTO solicitudes_borrado/, () => []]]);
  assertEquals((await llamar(repetida.sql, 'POST', 'cuenta/borrado')).s, 409);
});

Deno.test('ejecutar el borrado: solo docentes, auditoria antes y sin restos', async () => {
  const estudiante = conUsuario();
  assertEquals((await llamar(estudiante.sql, 'POST', `cuenta/borrado/${SOLICITUD}/ejecutar`)).s, 403);

  const { sql, consultas } = conUsuario([
    [/FROM solicitudes_borrado s/, () => [{ id: SOLICITUD, user_id: OTRO, firebase_uid: 'fb-otro', email: 'otro@ejemplo.co' }]],
  ]);
  const r = await llamar(sql, 'POST', `cuenta/borrado/${SOLICITUD}/ejecutar`, { email: 'docente@ejemplo.co' });
  assertEquals(r.s, 200);
  assertEquals(r.c.firebaseUid, 'fb-otro');
  const orden = consultas.map((c) => c.texto);
  const pos = (t: string) => orden.findIndex((x) => x.includes(t));
  assertEquals(pos('INSERT INTO auditoria_docente') < pos('DELETE FROM users WHERE'), true);
  assertEquals(pos('DELETE FROM users_rating_previo_016') >= 0, true);
  assertEquals(pos('DELETE FROM notificaciones WHERE clave') >= 0, true);
  assertEquals(pos("SET estado = 'ejecutada'") >= 0, true);
});

Deno.test('ejecutar sobre una cuenta de docente responde 409', async () => {
  const { sql, consultas } = conUsuario([
    [/FROM solicitudes_borrado s/, () => [{ id: SOLICITUD, user_id: OTRO, firebase_uid: 'fb', email: 'Docente@ejemplo.co' }]],
  ]);
  const r = await llamar(sql, 'POST', `cuenta/borrado/${SOLICITUD}/ejecutar`, { email: 'docente@ejemplo.co' });
  assertEquals(r.s, 409);
  assertEquals(consultas.some((c) => c.texto.includes('DELETE FROM users WHERE')), false);
});
