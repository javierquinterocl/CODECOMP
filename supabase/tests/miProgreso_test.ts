// Validaciones de GET /mi-progreso/dia que no necesitan base de datos.
import { assertEquals } from 'jsr:@std/assert';
import { miProgreso } from '../functions/_compartido/rutas/miProgreso.ts';
import type { Contexto } from '../functions/_compartido/contexto.ts';

// La base no se toca en estos casos: si alguna consulta llegara a correr, el test falla.
const sqlProhibido = (() => {
  throw new Error('no deberia consultar la base');
}) as unknown as Contexto['sql'];

const ctxDe = (ruta: string, conSesion = true): Contexto => {
  const url = new URL(`http://localhost/functions/v1/api/${ruta}`);
  return {
    req: new Request(url),
    url,
    sql: sqlProhibido,
    config: { zonaHoraria: 'America/Bogota' } as Contexto['config'],
    cors: {},
    identidad: conSesion ? ({ uid: 'u1' } as Contexto['identidad']) : null,
  };
};

const codigo = async (r: Response) => [r.status, (await r.json()).codigo];

Deno.test('mi-progreso responde 404 a un segmento que no conoce', async () => {
  assertEquals(await codigo(await miProgreso(ctxDe('mi-progreso/otra'), 'otra')), [404, 'ruta']);
});

Deno.test('mi-progreso/dia exige sesion', async () => {
  assertEquals(await codigo(await miProgreso(ctxDe('mi-progreso/dia?fecha=2026-11-01', false), 'dia')), [401, 'sin-sesion']);
});

Deno.test('mi-progreso/dia rechaza fechas invalidas sin consultar la base', async () => {
  for (const f of ['', 'ayer', '2026-02-30', '2099-01-01', '2020-01-01']) {
    assertEquals(await codigo(await miProgreso(ctxDe(`mi-progreso/dia?fecha=${f}`), 'dia')), [400, 'fecha']);
  }
});
