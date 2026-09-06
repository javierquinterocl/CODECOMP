

import { assert, assertEquals } from '@std/assert';
import postgres from 'postgres';

const leerUrl = async (): Promise<string> => {
  const delEntorno = Deno.env.get('DESTINO_DATABASE_URL');
  if (delEntorno) return delEntorno;
  try {
    const texto = await Deno.readTextFile('supabase/.env');
    for (const linea of texto.split('\n')) {
      const t = linea.trim();
      if (!t || t.startsWith('#')) continue;
      const i = t.indexOf('=');
      if (i === -1) continue;
      if (t.slice(0, i).trim() === 'DESTINO_DATABASE_URL') {
        return t.slice(i + 1).trim().replace(/^["']|["']$/g, '');
      }
    }
  } catch {
    // sin archivo
  }
  return '';
};

const url = await leerUrl();
const hayBase = Boolean(url);
const opciones = { ignore: !hayBase };

const conectar = () => postgres(url, { max: 1, prepare: false });

const PERIODO_DIA = '1999-01-01';
const PERIODO_MES = '1999-01';

const usuarioDePrueba = async (sql: postgres.Sql, sufijo: string): Promise<string> => {
  const uid = `test-integracion-${sufijo}`;
  const [fila] = await sql`
    INSERT INTO users (firebase_uid, username, email)
    VALUES (${uid}, ${uid}, ${uid + '@ejemplo.local'})
    ON CONFLICT (firebase_uid) DO UPDATE SET email = EXCLUDED.email
    RETURNING id
  `;
  await sql`DELETE FROM limites_envio WHERE user_id = ${fila.id}`;
  return fila.id as string;
};

const limpiar = async (sql: postgres.Sql) => {
  await sql`DELETE FROM users WHERE firebase_uid LIKE 'test-integracion-%'`;
  await sql`DELETE FROM presupuesto WHERE periodo IN (${PERIODO_DIA}, ${PERIODO_MES})`;
};

/* ── registrar_envio ────────────────────────────────────────────────────── */

Deno.test('registrar_envio: el primer envio pasa', opciones, async () => {
  const sql = conectar();
  try {
    const userId = await usuarioDePrueba(sql, 'primero');
    const [r] = await sql`SELECT * FROM registrar_envio(${userId}::uuid, CURRENT_DATE, 10, 100)`;
    assertEquals(r.permitido, true);
    assertEquals(r.conteo_dia, 1);
  } finally {
    await limpiar(sql);
    await sql.end();
  }
});

Deno.test('registrar_envio: el segundo envio inmediato choca con el cooldown', opciones, async () => {
  const sql = conectar();
  try {
    const userId = await usuarioDePrueba(sql, 'cooldown');
    await sql`SELECT * FROM registrar_envio(${userId}::uuid, CURRENT_DATE, 10, 100)`;
    const [r] = await sql`SELECT * FROM registrar_envio(${userId}::uuid, CURRENT_DATE, 10, 100)`;

    assertEquals(r.permitido, false);
    assertEquals(r.codigo, 'limite-espera');
    assert(r.espera_segundos > 0 && r.espera_segundos <= 10, `espera=${r.espera_segundos}`);
  } finally {
    await limpiar(sql);
    await sql.end();
  }
});

Deno.test('registrar_envio: sin cooldown, el tope diario corta', opciones, async () => {
  const sql = conectar();
  try {
    const userId = await usuarioDePrueba(sql, 'tope');
    // espera=0 aisla el tope diario del cooldown.
    const [a] = await sql`SELECT * FROM registrar_envio(${userId}::uuid, CURRENT_DATE, 0, 2)`;
    const [b] = await sql`SELECT * FROM registrar_envio(${userId}::uuid, CURRENT_DATE, 0, 2)`;
    const [c] = await sql`SELECT * FROM registrar_envio(${userId}::uuid, CURRENT_DATE, 0, 2)`;

    assertEquals([a.permitido, b.permitido, c.permitido], [true, true, false]);
    assertEquals(c.codigo, 'limite-diario');
    assertEquals(b.conteo_dia, 2);
  } finally {
    await limpiar(sql);
    await sql.end();
  }
});

Deno.test('registrar_envio: el contador se reinicia al cambiar de dia', opciones, async () => {
  const sql = conectar();
  try {
    const userId = await usuarioDePrueba(sql, 'nuevodia');
    await sql`SELECT * FROM registrar_envio(${userId}::uuid, CURRENT_DATE, 0, 1)`;
    const [mismoDia] = await sql`
      SELECT * FROM registrar_envio(${userId}::uuid, CURRENT_DATE, 0, 1)
    `;
    assertEquals(mismoDia.permitido, false);

    const [otroDia] = await sql`
      SELECT * FROM registrar_envio(${userId}::uuid, CURRENT_DATE + 1, 0, 1)
    `;
    assertEquals(otroDia.permitido, true);
    assertEquals(otroDia.conteo_dia, 1);
  } finally {
    await limpiar(sql);
    await sql.end();
  }
});

/* ── consumir_presupuesto ───────────────────────────────────────────────── */

Deno.test('consumir_presupuesto: cuenta hacia arriba y corta en el tope diario', opciones, async () => {
  const sql = conectar();
  try {
    await sql`DELETE FROM presupuesto WHERE periodo IN (${PERIODO_DIA}, ${PERIODO_MES})`;

    const [a] = await sql`SELECT * FROM consumir_presupuesto(${PERIODO_DIA}, ${PERIODO_MES}, 2, 100)`;
    const [b] = await sql`SELECT * FROM consumir_presupuesto(${PERIODO_DIA}, ${PERIODO_MES}, 2, 100)`;
    const [c] = await sql`SELECT * FROM consumir_presupuesto(${PERIODO_DIA}, ${PERIODO_MES}, 2, 100)`;

    assertEquals([a.usado_dia, b.usado_dia], [1, 2]);
    assertEquals(c.permitido, false);
    assertEquals(c.codigo, 'presupuesto-diario');
  } finally {
    await limpiar(sql);
    await sql.end();
  }
});

Deno.test('consumir_presupuesto: el tope mensual tambien corta', opciones, async () => {
  const sql = conectar();
  try {
    await sql`DELETE FROM presupuesto WHERE periodo IN (${PERIODO_DIA}, ${PERIODO_MES})`;

    await sql`SELECT * FROM consumir_presupuesto(${PERIODO_DIA}, ${PERIODO_MES}, 100, 1)`;
    const [r] = await sql`SELECT * FROM consumir_presupuesto(${PERIODO_DIA}, ${PERIODO_MES}, 100, 1)`;

    assertEquals(r.permitido, false);
    assertEquals(r.codigo, 'presupuesto-mensual');
  } finally {
    await limpiar(sql);
    await sql.end();
  }
});

Deno.test('consumir_presupuesto: un rechazo NO consume cupo', opciones, async () => {
  const sql = conectar();
  try {
    await sql`DELETE FROM presupuesto WHERE periodo IN (${PERIODO_DIA}, ${PERIODO_MES})`;

    await sql`SELECT * FROM consumir_presupuesto(${PERIODO_DIA}, ${PERIODO_MES}, 1, 100)`;
    await sql`SELECT * FROM consumir_presupuesto(${PERIODO_DIA}, ${PERIODO_MES}, 1, 100)`;
    await sql`SELECT * FROM consumir_presupuesto(${PERIODO_DIA}, ${PERIODO_MES}, 1, 100)`;

    const [fila] = await sql`SELECT llamadas FROM presupuesto WHERE periodo = ${PERIODO_DIA}`;
    assertEquals(fila.llamadas, 1, 'los rechazos no deben incrementar el contador');
  } finally {
    await limpiar(sql);
    await sql.end();
  }
});

/* ── get_recommended_problems ───────────────────────────────────────────── */

Deno.test('get_recommended_problems: devuelve sugerencias para un usuario con historial', opciones, async () => {
  const sql = conectar();
  try {
    const [usuario] = await sql`
      SELECT id, global_rating FROM users WHERE firebase_uid = 'sintetico-intermedio'
    `;
    if (!usuario) {
      console.log('  (falta el usuario sintetico; corre scripts/copiar_catalogo.ts)');
      return;
    }

    const filas = await sql`SELECT * FROM get_recommended_problems(${usuario.id}::uuid, 5)`;
    assert(filas.length > 0, 'no devolvio ninguna recomendacion');
    assert(filas.length <= 5, `devolvio ${filas.length}, mas del limite`);

    for (const f of filas) {
      assert(f.id && f.title, 'faltan campos en la recomendacion');
      const distancia = Math.abs(f.difficulty_rating - usuario.global_rating);
      assert(distancia <= 150, `dificultad ${f.difficulty_rating} fuera de rango`);
    }

    // Ordenadas por relevancia descendente.
    const puntajes = filas.map((f) => Number(f.relevance_score));
    const ordenadas = [...puntajes].sort((a, b) => b - a);
    assertEquals(puntajes, ordenadas, 'no vienen ordenadas por relevancia');
  } finally {
    await sql.end();
  }
});

Deno.test('get_recommended_problems: respeta el limite pedido', opciones, async () => {
  const sql = conectar();
  try {
    const [usuario] = await sql`
      SELECT id FROM users WHERE firebase_uid = 'sintetico-avanzado'
    `;
    if (!usuario) return;

    for (const limite of [1, 3, 10]) {
      const filas = await sql`SELECT * FROM get_recommended_problems(${usuario.id}::uuid, ${limite})`;
      assert(filas.length <= limite, `pedidas ${limite}, llegaron ${filas.length}`);
    }
  } finally {
    await sql.end();
  }
});

if (!hayBase) {
  console.log('\n  (pruebas de integracion omitidas: falta DESTINO_DATABASE_URL)\n');
}
