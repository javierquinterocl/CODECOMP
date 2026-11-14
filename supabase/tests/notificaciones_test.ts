import { assertEquals } from '@std/assert';
import type { Config } from '../functions/_compartido/config.ts';
import type { Contexto } from '../functions/_compartido/contexto.ts';
import type { Sql } from '../functions/_compartido/db.ts';
import {
  notificar,
  recordatorioDe,
  relojEn,
  semanaIso,
  TIPOS_CON_CORREO,
} from '../functions/_compartido/notificaciones.ts';
import {
  enviarPendientes,
  escaparHtml,
  type Mensaje,
  mensajeDe,
  tokenDeBaja,
  usuarioDeBaja,
} from '../functions/_compartido/correo.ts';
import { correoBaja, cronAvisos } from '../functions/_compartido/rutas/cron.ts';
import { docente, validarAviso } from '../functions/_compartido/rutas/docente.ts';
import { notificaciones } from '../functions/_compartido/rutas/notificaciones.ts';

// Claves inventadas, solo para pruebas.
const CONFIG = {
  zonaHoraria: 'America/Bogota',
  resendApiKey: 're_inventada_para_pruebas',
  correoRemitente: 'CODECOMP <avisos@codecomp.online>',
  correoMaxDiario: 90,
  correoMaxMensual: 2900,
  correoFirmaClave: 'firma-inventada-para-pruebas',
  cronClave: 'cron-inventado-para-pruebas',
  appUrl: 'https://codecomp.online',
  apiUrl: 'https://api.codecomp.online',
  docentes: new Set(['docente@ejemplo.co']),
} as unknown as Config;

const USUARIO = '11111111-2222-4333-8444-555555555555';

interface Consulta { texto: string; valores: unknown[] }

// Base de mentira: responde con la primera regla cuyo patron aparece en la consulta.
const baseFalsa = (reglas: [RegExp, (v: unknown[]) => unknown[] | Error][] = []) => {
  const consultas: Consulta[] = [];
  const sql = ((partes: TemplateStringsArray, ...valores: unknown[]) => {
    const texto = partes.join('?');
    consultas.push({ texto, valores });
    for (const [patron, respuesta] of reglas) {
      if (patron.test(texto)) {
        const r = respuesta(valores);
        return r instanceof Error ? Promise.reject(r) : Promise.resolve(Object.assign(r, { count: r.length }));
      }
    }
    return Promise.resolve(Object.assign([], { count: 0 }));
  }) as unknown as Sql;
  return { sql, consultas };
};

/* ── Fechas del cron ───────────────────────────────────────────────────── */

Deno.test('semanaIso sigue la norma ISO, tambien en el cambio de anio', () => {
  assertEquals(semanaIso('2026-11-13'), '2026-W46');
  assertEquals(semanaIso('2027-01-01'), '2026-W53');
  assertEquals(semanaIso('2024-12-30'), '2025-W01');
  assertEquals(semanaIso('2026-01-05'), '2026-W02');
});

Deno.test('relojEn da la hora y el dia de la semana de Bogota, no los de UTC', () => {
  // Lunes 16 de noviembre de 2026 a las 12:00 UTC = 7:00 en Bogota.
  assertEquals(relojEn('America/Bogota', new Date('2026-11-16T12:00:00Z')), { hora: 7, diaSemana: 1, fecha: '2026-11-16' });
  // Martes 3:00 UTC sigue siendo lunes en Bogota.
  assertEquals(relojEn('America/Bogota', new Date('2026-11-17T03:00:00Z')).diaSemana, 1);
});

Deno.test('recordatorioDe: 1 hora antes, 1 dia antes o nada', () => {
  const ahora = new Date('2026-11-16T12:00:00Z');
  const en = (min: number) => new Date(ahora.getTime() + min * 60_000);
  assertEquals(recordatorioDe(en(30), ahora), '1h');
  assertEquals(recordatorioDe(en(60), ahora), '1h');
  assertEquals(recordatorioDe(en(61), ahora), '1d');
  assertEquals(recordatorioDe(en(24 * 60), ahora), '1d');
  assertEquals(recordatorioDe(en(24 * 60 + 1), ahora), null);
  assertEquals(recordatorioDe(en(-5), ahora), null);
});

/* ── Alta de avisos ────────────────────────────────────────────────────── */

Deno.test('notificar marca correo pendiente solo en los tipos que van por correo', async () => {
  const { sql, consultas } = baseFalsa([[/INSERT INTO notificaciones/, () => [{ id: 'a' }, { id: 'b' }]]]);
  const hechas = await notificar(sql, [
    { userId: USUARIO, tipo: 'docente', clave: 'docente-x', datos: { titulo: 'Hola' } },
    { userId: USUARIO, tipo: 'resuelto', clave: 'resuelto-p-1' },
  ]);
  assertEquals(hechas, 2);
  assertEquals(consultas[0].texto.includes('ON CONFLICT (user_id, clave) DO UPDATE'), true);
  assertEquals(consultas[0].texto.includes('IS DISTINCT FROM'), true);
  assertEquals(consultas[0].valores[4], ['pendiente', '']);
  assertEquals([...TIPOS_CON_CORREO].sort(), ['cierre_1d', 'competencia_1d', 'docente', 'resumen_semanal']);
});

Deno.test('notificar sin filas no consulta la base', async () => {
  const { sql, consultas } = baseFalsa();
  assertEquals(await notificar(sql, []), 0);
  assertEquals(consultas.length, 0);
});

/* ── Correo ────────────────────────────────────────────────────────────── */

Deno.test('el enlace de baja solo vale con la firma correcta', async () => {
  const token = await tokenDeBaja(CONFIG.correoFirmaClave, USUARIO);
  assertEquals(await usuarioDeBaja(CONFIG.correoFirmaClave, token), USUARIO);
  assertEquals(await usuarioDeBaja('otra-clave', token), null);
  assertEquals(await usuarioDeBaja(CONFIG.correoFirmaClave, token.slice(0, -2) + 'xx'), null);
  const otro = '99999999-2222-4333-8444-555555555555';
  assertEquals(await usuarioDeBaja(CONFIG.correoFirmaClave, `${otro}.${token.split('.')[1]}`), null);
  assertEquals(await usuarioDeBaja('', token), null);
});

Deno.test('el correo del docente escapa el HTML, el asunto va en una linea y lleva la baja', async () => {
  const m = (await mensajeDe({
    id: 'n1',
    tipo: 'docente',
    userId: USUARIO,
    email: 'estudiante@ejemplo.co',
    datos: { titulo: 'Examen\nmañana', texto: '<script>alert(1)</script>', clase: 'Maratón' },
  }, CONFIG))!;
  assertEquals(m.subject, 'Maratón: Examen mañana');
  assertEquals(m.html.includes('<script>'), false);
  assertEquals(m.html.includes(escaparHtml('<script>alert(1)</script>')), true);
  assertEquals(m.headers['List-Unsubscribe-Post'], 'List-Unsubscribe=One-Click');
  assertEquals(m.headers['List-Unsubscribe'].startsWith('<https://api.codecomp.online/correo/baja?t='), true);
  assertEquals(m.text.includes('Dejar de recibir correos: https://api.codecomp.online/correo/baja?t='), true);
});

Deno.test('el resumen semanal solo lleva conteos y los tipos sin correo no arman mensaje', async () => {
  const resumen = (await mensajeDe({
    id: 'n2',
    tipo: 'resumen_semanal',
    userId: USUARIO,
    email: 'docente@ejemplo.co',
    datos: { clases: [{ nombre: 'Grupo A', alertas: 2, nuevos: 1, activos: 5 }] },
  }, CONFIG))!;
  assertEquals(resumen.text.includes('Grupo A: 5 resolvieron algo, 2 con alertas, 1 nuevos.'), true);
  assertEquals(await mensajeDe({ id: 'n3', tipo: 'resuelto', userId: USUARIO, email: 'x@y.co', datos: {} }, CONFIG), null);
});

const pendiente = (id: string, tipo = 'docente') => ({
  id,
  tipo,
  datos: { titulo: 'T', texto: 'X', clase: 'C' },
  correo_intentos: 1,
  user_id: USUARIO,
  email: 'estudiante@ejemplo.co',
});

const correoFalso = (cupo: number, reclamadas: ReturnType<typeof pendiente>[], presupuestoFalla = false) => {
  let usados = 0;
  return baseFalsa([
    [/correo = 'omitido'\s+FROM users/, () => []],
    [/SET correo = 'enviando'/, () => reclamadas],
    [/consumir_presupuesto/, () => {
      if (presupuestoFalla) return new Error('sin base');
      usados++;
      return [usados <= cupo ? { permitido: true } : { permitido: false, codigo: 'presupuesto-diario' }];
    }],
  ]);
};

Deno.test('enviarPendientes sin llave de Resend no hace nada', async () => {
  const { sql, consultas } = baseFalsa();
  const r = await enviarPendientes(sql, { ...CONFIG, resendApiKey: '' } as Config, () => Promise.resolve(true));
  assertEquals(r, { enviados: 0, omitidos: 0 });
  assertEquals(consultas.length, 0);
});

Deno.test('enviarPendientes envia en orden de prioridad, marca enviado y filtra lo que no se debe', async () => {
  const { sql, consultas } = correoFalso(10, [pendiente('b', 'cierre_1d'), pendiente('a', 'docente')]);
  let enviados: Mensaje[] = [];
  const r = await enviarPendientes(sql, CONFIG, (m) => { enviados = m; return Promise.resolve(true); });
  assertEquals(r.enviados, 2);
  assertEquals(enviados[0].subject.startsWith('C: T'), true); // el del docente va primero
  const omitir = consultas.find((c) => c.texto.includes("SET correo = 'omitido'\n    FROM users"))!.texto;
  for (const regla of ['NOT u.avisos_correo', 'NOT u.correo_verificado', '@firebase.local', '@codecomp.test']) {
    assertEquals(omitir.includes(regla), true);
  }
  assertEquals(consultas.some((c) => c.texto.includes('FOR UPDATE SKIP LOCKED')), true);
  assertEquals(consultas.some((c) => c.texto.includes("SET correo = 'enviado'")), true);
});

Deno.test('enviarPendientes respeta el cupo diario y devuelve a la cola lo que no cabe', async () => {
  const { sql, consultas } = correoFalso(1, [pendiente('a'), pendiente('b')]);
  let cuantos = 0;
  await enviarPendientes(sql, CONFIG, (m) => { cuantos = m.length; return Promise.resolve(true); });
  assertEquals(cuantos, 1);
  const devuelta = consultas.find((c) => c.texto.includes("SET correo = 'pendiente', correo_intentos = correo_intentos - 1"));
  assertEquals(devuelta?.valores[0], ['b']);
});

Deno.test('si no se puede revisar el cupo, no se envia nada', async () => {
  const { sql } = correoFalso(10, [pendiente('a')], true);
  let llamado = false;
  const r = await enviarPendientes(sql, CONFIG, () => { llamado = true; return Promise.resolve(true); });
  assertEquals(llamado, false);
  assertEquals(r.enviados, 0);
});

Deno.test('si Resend falla, vuelve a la cola o queda fallido tras 3 intentos', async () => {
  const { sql, consultas } = correoFalso(10, [pendiente('a')]);
  await enviarPendientes(sql, CONFIG, () => Promise.resolve(false));
  const fin = consultas.at(-1)!;
  assertEquals(fin.texto.includes("WHEN correo_intentos >= ? THEN 'fallido' ELSE 'pendiente'"), true);
  assertEquals(fin.valores[0], 3);
});

/* ── Cron y baja ───────────────────────────────────────────────────────── */

const pedirCron = (clave?: string, config = CONFIG) => {
  const { sql } = baseFalsa();
  const headers: Record<string, string> = clave === undefined ? {} : { 'x-cron-clave': clave };
  return cronAvisos(new Request('http://local/cron/avisos', { method: 'POST', headers }), sql, config, {
    ahora: new Date('2026-11-16T12:00:00Z'),
    enviar: () => Promise.resolve(true),
  });
};

Deno.test('el cron exige la clave y no corre si la clave esta vacia', async () => {
  assertEquals((await pedirCron()).status, 401);
  assertEquals((await pedirCron('otra')).status, 401);
  assertEquals((await pedirCron('', { ...CONFIG, cronClave: '' } as Config)).status, 401);
  const ok = await pedirCron(CONFIG.cronClave);
  assertEquals(ok.status, 200);
  // Lunes a las 7:00 en Bogota: corren el cierre a 1 dia y el resumen semanal.
  assertEquals(Object.keys(await ok.json()).sort(), ['cierres', 'competencias', 'correo', 'purga', 'resumenes']);
});

Deno.test('la baja con GET pide confirmar y con POST apaga los correos', async () => {
  const token = await tokenDeBaja(CONFIG.correoFirmaClave, USUARIO);
  const url = new URL(`http://local/correo/baja?t=${encodeURIComponent(token)}`);
  const { sql, consultas } = baseFalsa();
  const get = await correoBaja(new Request(url), url, sql, CONFIG);
  assertEquals(get.status, 200);
  assertEquals((await get.text()).includes('<form method="post">'), true);
  assertEquals(consultas.length, 0);
  const post = await correoBaja(new Request(url, { method: 'POST' }), url, sql, CONFIG);
  assertEquals(post.status, 200);
  assertEquals(consultas[0].texto.includes('SET avisos_correo = false'), true);
  assertEquals(consultas[0].valores[0], USUARIO);
  const mala = new URL('http://local/correo/baja?t=nada');
  assertEquals((await correoBaja(new Request(mala), mala, sql, CONFIG)).status, 400);
});

/* ── Aviso del docente ─────────────────────────────────────────────────── */

Deno.test('validarAviso limpia y limita titulo y texto', () => {
  assertEquals(validarAviso({ titulo: '  Hola\u0007 ', texto: 'Linea 1\nLinea 2' }), { titulo: 'Hola', texto: 'Linea 1\nLinea 2' });
  assertEquals(validarAviso({ titulo: 'x'.repeat(81), texto: 'y' }), null);
  assertEquals(validarAviso({ titulo: 'x', texto: 'y'.repeat(501) }), null);
  assertEquals(validarAviso({ titulo: '', texto: 'y' }), null);
  assertEquals(validarAviso(null), null);
});

const CLASE = '22222222-3333-4444-8555-666666666666';
const ctxDocente = (sql: Sql, cuerpo: unknown, email = 'docente@ejemplo.co') => ({
  req: new Request(`http://local/docente/clase/${CLASE}/aviso`, { method: 'POST', body: JSON.stringify(cuerpo) }),
  url: new URL(`http://local/docente/clase/${CLASE}/aviso`),
  sql,
  config: CONFIG,
  cors: {},
  identidad: { uid: 'docente-1', email, emailVerificado: true },
} as unknown as Contexto);

Deno.test('el aviso del docente llega a la clase, se audita y un doble clic no lo duplica', async () => {
  const claves: string[] = [];
  const { sql, consultas } = baseFalsa([
    [/FROM users WHERE firebase_uid/, () => [{ id: 'docente-id', email: 'docente@ejemplo.co', correo_verificado: true }]],
    [/FROM clases WHERE id/, () => [{ id: CLASE, nombre: 'Grupo A' }]],
    [/count\(\*\)::int AS hoy/, () => [{ hoy: 0 }]],
    [/FROM clase_miembros WHERE clase_id/, () => [{ user_id: 'e1' }, { user_id: 'e2' }]],
    [/INSERT INTO notificaciones/, (v) => { claves.push(...(v[2] as string[])); return [{ id: 'n1' }, { id: 'n2' }]; }],
  ]);
  const aviso = { titulo: 'Practica', texto: 'El jueves a las 2' };
  const r = await docente(ctxDocente(sql, aviso), 'clase', CLASE, 'aviso');
  assertEquals(r.status, 201);
  assertEquals(await r.json(), { destinatarios: 2, restantes: 2 });
  assertEquals(consultas.some((c) => c.texto.includes('INSERT INTO auditoria_docente') && c.valores.includes('avisar_clase')), true);
  await docente(ctxDocente(sql, aviso), 'clase', CLASE, 'aviso');
  assertEquals(claves[0], claves[2]); // misma clase, texto y dia: misma clave
});

Deno.test('el aviso del docente respeta el tope diario y solo es para docentes', async () => {
  const { sql } = baseFalsa([
    [/FROM users WHERE firebase_uid/, () => [{ id: 'docente-id', email: 'docente@ejemplo.co', correo_verificado: true }]],
    [/FROM clases WHERE id/, () => [{ id: CLASE, nombre: 'Grupo A' }]],
    [/count\(\*\)::int AS hoy/, () => [{ hoy: 3 }]],
  ]);
  assertEquals((await docente(ctxDocente(sql, { titulo: 'a', texto: 'b' }), 'clase', CLASE, 'aviso')).status, 429);
  assertEquals((await docente(ctxDocente(sql, { titulo: 'a', texto: 'b' }, 'otro@ejemplo.co'), 'clase', CLASE, 'aviso')).status, 403);
});

/* ── Campana ───────────────────────────────────────────────────────────── */

const ctxCampana = (sql: Sql, metodo: string, ruta: string, cuerpo?: unknown) => ({
  req: new Request(`http://local/${ruta}`, { method: metodo, body: cuerpo ? JSON.stringify(cuerpo) : undefined }),
  url: new URL(`http://local/${ruta}`),
  sql,
  config: CONFIG,
  cors: {},
  identidad: { uid: 'estudiante-1', email: 'estudiante@ejemplo.co', emailVerificado: true },
} as unknown as Contexto);

Deno.test('marcar leidas solo acepta ids validos y solo toca los propios', async () => {
  const { sql, consultas } = baseFalsa([
    [/FROM users WHERE firebase_uid/, () => [{ id: USUARIO, email: 'estudiante@ejemplo.co', correo_verificado: true }]],
    [/AS sin_leer/, () => [{ sin_leer: 0 }]],
  ]);
  const malo = await notificaciones(ctxCampana(sql, 'POST', 'notificaciones/leidas', { ids: ['no-uuid'] }), 'leidas');
  assertEquals(malo.status, 400);
  const id = '33333333-4444-4555-8666-777777777777';
  const bien = await notificaciones(ctxCampana(sql, 'POST', 'notificaciones/leidas', { ids: [id] }), 'leidas');
  assertEquals(bien.status, 200);
  const marcar = consultas.find((c) => c.texto.includes('SET leida_en = now()'))!;
  assertEquals(marcar.texto.includes('user_id = ?'), true);
  assertEquals(marcar.valores, [USUARIO, [id]]);
});

Deno.test('la campana guarda los avisos calculados con claves estables y retira los vencidos', async () => {
  let claves: string[] = [];
  const { sql, consultas } = baseFalsa([
    [/FROM users WHERE firebase_uid/, () => [{ id: USUARIO, email: 'estudiante@ejemplo.co', correo_verificado: true }]],
    [/SELECT DISTINCT \(created_at AT TIME ZONE/, () => []],
    [/primer_fallo/, () => [
      { numero: 7, titulo: 'Siete', titulo_es: null, primer_fallo: new Date(Date.now() - 4.5 * 86_400_000) },
      { numero: 8, titulo: 'Ocho', titulo_es: null, primer_fallo: new Date(Date.now() - 6.5 * 86_400_000) },
    ]],
    [/INSERT INTO notificaciones/, (v) => { claves = v[2] as string[]; return []; }],
    [/AS sin_leer/, () => [{ sin_leer: 0 }]],
  ]);
  const r = await notificaciones(ctxCampana(sql, 'GET', 'notificaciones'));
  assertEquals(r.status, 200);
  // Con 3 dias restantes va a la campana; con 1 dia lo cubre el cron (cierre_1d).
  assertEquals(claves, ['cierre-7']);
  const borrar = consultas.find((c) => c.texto.includes('DELETE FROM notificaciones'))!;
  assertEquals(borrar.valores.at(-1), ['cierre-7']);
});
