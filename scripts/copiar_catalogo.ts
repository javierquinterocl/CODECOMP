

import postgres from 'postgres';

const LOTE = 500;

// En orden de llaves foraneas.
const TABLAS = ['tags', 'problems', 'problem_tags', 'test_cases'] as const;

const args = new Set(Deno.args);
const soloCatalogo = args.has('--solo-catalogo');
const simulacion = args.has('--dry-run');

const leerEnv = async (): Promise<Record<string, string>> => {
  const vars: Record<string, string> = {};
  try {
    const texto = await Deno.readTextFile('supabase/.env');
    for (const linea of texto.split('\n')) {
      const limpia = linea.trim();
      if (!limpia || limpia.startsWith('#')) continue;
      const i = limpia.indexOf('=');
      if (i === -1) continue;
      vars[limpia.slice(0, i).trim()] = limpia.slice(i + 1).trim().replace(/^["']|["']$/g, '');
    }
  } catch {
    // Sin archivo: se usan solo las variables del entorno.
  }
  return vars;
};


export const enmascarar = (url: string): string => {
  const m = url.match(/^([a-zA-Z][\w+.-]*:\/\/)([^:@/\s]+):([^@\s]+)@(.+)$/);
  if (!m) return '<url no reconocida>';
  return `${m[1]}${m[2]}:***@${m[4]}`;
};


export const revisarUrl = (url: string): string | null => {
  if (!/^postgres(ql)?:\/\//.test(url)) {
    return "debe empezar por 'postgresql://'";
  }
  if (/^postgres(ql)?:postgres(ql)?:\/\//.test(url)) {
    return "lleva el esquema duplicado ('postgresql:postgresql://')";
  }
  const resto = url.replace(/^postgres(ql)?:\/\//, '');
  if (!resto.includes('@')) return 'no tiene la parte usuario:clave@servidor';
  const [credenciales, servidor] = [
    resto.slice(0, resto.lastIndexOf('@')),
    resto.slice(resto.lastIndexOf('@') + 1),
  ];
  if (!credenciales.includes(':')) return 'no trae contrasena (falta usuario:clave)';
  if (!servidor.includes('/')) return 'no indica el nombre de la base al final';
  return null;
};

const main = async () => {
  const env = await leerEnv();
  const urlOrigen = Deno.env.get('ORIGEN_DATABASE_URL') ?? env.ORIGEN_DATABASE_URL ?? '';
  const urlDestino = Deno.env.get('DESTINO_DATABASE_URL') ?? env.DESTINO_DATABASE_URL ?? '';

  if (!urlOrigen || !urlDestino) {
    console.error('Faltan ORIGEN_DATABASE_URL o DESTINO_DATABASE_URL en supabase/.env');
    Deno.exit(1);
  }
  for (const [nombre, url] of [['ORIGEN', urlOrigen], ['DESTINO', urlDestino]]) {
    const problema = revisarUrl(url);
    if (problema) {
      console.error(`${nombre}_DATABASE_URL: ${problema}`);
      Deno.exit(1);
    }
  }
  if (urlOrigen === urlDestino) {
    console.error('El origen y el destino son la misma base. Abortado.');
    Deno.exit(1);
  }

  console.log(`Origen  (solo lectura): ${enmascarar(urlOrigen)}`);
  console.log(`Destino               : ${enmascarar(urlDestino)}`);
  if (simulacion) console.log('MODO SIMULACION: no se escribe nada.\n');

  const origen = postgres(urlOrigen, { max: 1, prepare: false, ssl: 'require' });
  const destino = postgres(urlDestino, { max: 1, prepare: false, ssl: 'require' });

  try {
    // El esquema debe existir: correr database/esquema_completo.sql antes.
    for (const tabla of TABLAS) {
      const [existe] = await destino`SELECT to_regclass(${'public.' + tabla}) AS t`;
      if (!existe.t) {
        console.error(`\nLa tabla "${tabla}" no existe en el destino.`);
        console.error('Corre primero los 5 archivos de database/ en el SQL Editor.');
        Deno.exit(1);
      }
    }

    console.log('\n── Catalogo ──');
    for (const tabla of TABLAS) {
      const filas = await origen`SELECT * FROM ${origen(tabla)}`;
      if (!filas.length) {
        console.log(`  ${tabla.padEnd(14)} 0 filas en el origen`);
        continue;
      }

      let escritas = 0;
      if (!simulacion) {
        for (let i = 0; i < filas.length; i += LOTE) {
          const lote = filas.slice(i, i + LOTE);
          const res = await destino`
            INSERT INTO ${destino(tabla)} ${destino(lote)} ON CONFLICT DO NOTHING
          `;
          escritas += res.count;
        }
      }

      const [{ total }] = await destino`SELECT count(*)::int AS total FROM ${destino(tabla)}`;
      console.log(
        `  ${tabla.padEnd(14)} ${String(filas.length).padStart(6)} leidas` +
          `  ${String(escritas).padStart(6)} nuevas  ${String(total).padStart(6)} en destino`,
      );
    }

    if (!soloCatalogo) {
      console.log('\n── Usuarios sinteticos ──');
      await sembrarUsuarios(destino, simulacion);
    }

    console.log('\nListo.');
  } finally {
    await origen.end();
    await destino.end();
  }
};

// firebase_uid 'sintetico-*' para poder borrarlos de un solo DELETE.
const sembrarUsuarios = async (sql: postgres.Sql, simulacion: boolean) => {
  const perfiles = [
    { slug: 'novato', rating: 900, dominio: 0.25 },
    { slug: 'intermedio', rating: 1200, dominio: 0.5 },
    { slug: 'avanzado', rating: 1600, dominio: 0.72 },
    { slug: 'experto', rating: 2000, dominio: 0.9 },
    { slug: 'recien-llegado', rating: 1000, dominio: 0 },
  ];

  const tags = await sql`SELECT id FROM tags ORDER BY name LIMIT 12`;
  if (!tags.length) {
    console.log('  (no hay tags en el destino; se omite)');
    return;
  }

  for (const perfil of perfiles) {
    const uid = `sintetico-${perfil.slug}`;
    if (simulacion) {
      console.log(`  ${uid.padEnd(26)} rating ${perfil.rating} (simulado)`);
      continue;
    }

    const [usuario] = await sql`
      INSERT INTO users (firebase_uid, username, email, global_rating)
      VALUES (${uid}, ${uid}, ${uid + '@ejemplo.local'}, ${perfil.rating})
      ON CONFLICT (firebase_uid) DO UPDATE SET global_rating = EXCLUDED.global_rating
      RETURNING id
    `;

    if (perfil.dominio === 0) {
      console.log(`  ${uid.padEnd(26)} rating ${perfil.rating}, sin historial`);
      continue;
    }

    // Baja de tag en tag: asi hay fuertes y debiles que priorizar.
    let intentosTotales = 0;
    let exitosTotales = 0;
    for (const [i, tag] of tags.entries()) {
      const factor = Math.max(0.05, perfil.dominio - i * 0.06);
      const intentos = 4 + (i % 5);
      const exitos = Math.round(intentos * factor);
      intentosTotales += intentos;
      exitosTotales += exitos;

      await sql`
        INSERT INTO user_tag_mastery (user_id, tag_id, attempts, successes, mastery_score)
        VALUES (${usuario.id}, ${tag.id}, ${intentos}, ${exitos},
                ${Number((exitos / intentos * 100).toFixed(2))})
        ON CONFLICT (user_id, tag_id) DO UPDATE SET
          attempts = EXCLUDED.attempts,
          successes = EXCLUDED.successes,
          mastery_score = EXCLUDED.mastery_score
      `;
    }

    await sql`
      UPDATE users SET attempted_count = ${intentosTotales}, solved_count = ${exitosTotales}
      WHERE id = ${usuario.id}
    `;

    console.log(
      `  ${uid.padEnd(26)} rating ${perfil.rating}, ${tags.length} tags, ` +
        `${exitosTotales}/${intentosTotales} resueltos`,
    );
  }

  console.log('\n  Para borrarlos despues:');
  console.log("  DELETE FROM users WHERE firebase_uid LIKE 'sintetico-%';");
};

if (import.meta.main) await main();
