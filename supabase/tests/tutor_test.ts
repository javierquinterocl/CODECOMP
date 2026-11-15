import { assertEquals } from '@std/assert';
import type { Config } from '../functions/_compartido/config.ts';
import type { Contexto } from '../functions/_compartido/contexto.ts';
import type { Sql } from '../functions/_compartido/db.ts';
import { sistemaDeNivel, tutor } from '../functions/_compartido/rutas/tutor.ts';

const USUARIO = '11111111-2222-4333-8444-555555555555';
const CONFIG = { zonaHoraria: 'America/Bogota', iaApiKey: 'llave-inventada', iaEsperaSegundos: 60, docentes: new Set() } as unknown as Config;

// Base de mentira: responde con la primera regla cuyo patron aparece y anota las consultas.
const baseFalsa = (reglas: [RegExp, () => unknown[]][]) => {
  const consultas: string[] = [];
  const sql = ((partes: TemplateStringsArray) => {
    const texto = partes.join('?');
    consultas.push(texto);
    const regla = reglas.find(([patron]) => patron.test(texto));
    return Promise.resolve(regla ? regla[1]() : []);
  }) as unknown as Sql;
  return { sql, consultas };
};

const USUARIO_FILA: [RegExp, () => unknown[]] = [/FROM users WHERE firebase_uid/, () => [{ id: USUARIO, email: 'e@ejemplo.co', correo_verificado: true }]];

const llamar = async (sql: Sql, ruta: string, cuerpo: unknown, accion?: string) => {
  const ctx = {
    req: new Request(`http://local/${ruta}`, { method: 'POST', body: JSON.stringify(cuerpo) }),
    sql,
    config: CONFIG,
    cors: {},
    identidad: { uid: 'firebase-1', email: 'e@ejemplo.co', emailVerificado: true },
  } as unknown as Contexto;
  const r = await tutor(ctx, accion);
  return { s: r.status, c: await r.json() };
};

const ENVIO = { problem_number: 7, source_code: 'print(1)', verdict: 'WRONG_ANSWER' };

Deno.test('sistemaDeNivel: cada nivel lleva sus instrucciones y las reglas comunes', () => {
  assertEquals(sistemaDeNivel(1).includes('Nunca nombres el algoritmo exacto'), true);
  assertEquals(sistemaDeNivel(2).includes('Nunca nombres el algoritmo exacto'), false);
  assertEquals(sistemaDeNivel(2).includes('puedes nombrar la tecnica'), true);
  assertEquals(sistemaDeNivel(3).includes('como maximo 4 pasos'), true);
  for (const n of [1, 2, 3]) assertEquals(sistemaDeNivel(n).includes('Nunca escribas la solucion'), true);
});

Deno.test('tutor: nivel fuera de rango o en texto se rechaza', async () => {
  const { sql } = baseFalsa([USUARIO_FILA]);
  assertEquals((await llamar(sql, 'tutor', { ...ENVIO, nivel: 4 })).s, 400);
  assertEquals((await llamar(sql, 'tutor', { ...ENVIO, nivel: '2' })).s, 400);
});

Deno.test('tutor: la pista 2 sin la 1 se rechaza antes de gastar turno o presupuesto', async () => {
  const { sql, consultas } = baseFalsa([USUARIO_FILA, [/FROM problems WHERE problem_number/, () => [{ id: 'p1', title: 'T', description_markdown: 'D', difficulty_rating: 1200 }]]]);
  const r = await llamar(sql, 'tutor', { ...ENVIO, nivel: 2 });
  assertEquals([r.s, r.c.codigo], [409, 'nivel-previo']);
  assertEquals(consultas.some((c) => /registrar_pista|consumir_presupuesto/.test(c)), false);
});

Deno.test('idea clave: sin resolver se niega; guardada se entrega sin gastar', async () => {
  const sinResolver = baseFalsa([USUARIO_FILA, [/LEFT JOIN ideas_clave/, () => [{ id: 'p1', idea: null, resuelto: false }]]]);
  assertEquals((await llamar(sinResolver.sql, 'tutor/idea', { problem_number: 7 }, 'idea')).s, 403);

  const guardada = baseFalsa([USUARIO_FILA, [/LEFT JOIN ideas_clave/, () => [{ id: 'p1', idea: 'La idea.', resuelto: true }]]]);
  const r = await llamar(guardada.sql, 'tutor/idea', { problem_number: 7 }, 'idea');
  assertEquals([r.s, r.c.idea, r.c.guardada], [200, 'La idea.', true]);
  assertEquals(guardada.consultas.some((c) => /registrar_pista|consumir_presupuesto/.test(c)), false);
});
