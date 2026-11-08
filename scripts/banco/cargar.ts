// Carga en la base los problemas del banco local (un JSON por problema). Con --dry-run solo valida y cuenta.
// --reservar deja inactivos (motivo 'torneo') los problemas de un torneo hasta que termine.
// Uso: deno run -A scripts/banco/cargar.ts --dir <carpeta de JSON> [--reservar clave,clave] [--dry-run]

import { parseArgs } from 'jsr:@std/cli@1.0.6/parse-args';
import { join } from 'jsr:@std/path@1.0.8';
import { cargarConfig } from '../../supabase/functions/_compartido/config.ts';
import { conexion } from '../../supabase/functions/_compartido/db.ts';
import { type Problema, validar } from './formato.ts';

const args = parseArgs(Deno.args, { string: ['dir', 'reservar'], boolean: ['dry-run'] });
if (!args.dir) throw new Error('Falta --dir');
const reservados = new Set((args.reservar ?? '').split(',').map((c) => c.trim()).filter(Boolean));

const problemas: Problema[] = [];
for (const f of Deno.readDirSync(args.dir)) {
  if (f.isFile && f.name.endsWith('.json')) {
    problemas.push(JSON.parse(await Deno.readTextFile(join(args.dir, f.name))));
  }
}
problemas.sort((a, b) => a.numero - b.numero);

const errores = problemas.flatMap(validar);
const repetidos = (campo: 'clave' | 'numero') =>
  problemas.map((p) => p[campo]).filter((v, i, t) => t.indexOf(v) !== i);
for (const campo of ['clave', 'numero'] as const) {
  for (const v of repetidos(campo)) errores.push(`${campo} repetido: ${v}`);
}
for (const c of reservados) {
  if (!problemas.some((p) => p.clave === c)) errores.push(`reservado desconocido: ${c}`);
}
// La base rechaza dos casos iguales del mismo problema (003) y abortaria toda la carga.
for (const p of problemas) {
  const vistos = new Set<string>();
  for (const c of p.casos) {
    const llave = `${c.entrada}\u0000${c.salida}`;
    if (vistos.has(llave)) errores.push(`${p.clave}: caso repetido`);
    vistos.add(llave);
  }
}
if (errores.length) {
  console.error(`No pasan la validacion (${errores.length}):`);
  for (const e of errores) console.error(`  - ${e}`);
  Deno.exit(1);
}

const porCategoria = Object.entries(
  problemas.reduce<Record<string, number>>((t, p) => ({ ...t, [p.categoria]: (t[p.categoria] ?? 0) + 1 }), {}),
).map(([c, n]) => `${c} ${n}`).join(', ');
console.log(`Problemas validos: ${problemas.length} (${porCategoria}).`);
console.log(`Sin traducir: ${problemas.filter((p) => !p.enunciado_es).length}.`);
console.log(`Reservados para torneo (inactivos): ${reservados.size}.`);

if (args['dry-run']) {
  console.log('Simulacion: no se escribio nada.');
  Deno.exit(0);
}

const sql = conexion(cargarConfig().databaseUrl);
try {
  // Ni un numero ni un slug del banco pueden pertenecer al catalogo de Codeforces.
  const ajenos = await sql`
    SELECT slug, problem_number FROM problems
    WHERE fuente IS NULL AND (slug = ANY(${problemas.map((p) => p.clave)})
      OR problem_number = ANY(${problemas.map((p) => p.numero)}))
  `;
  if (ajenos.length) throw new Error(`Chocan con problemas de Codeforces: ${ajenos.length}`);

  await sql.begin(async (tx) => {
    for (const p of problemas) {
      const activo = !reservados.has(p.clave);
      const motivos = activo ? [] : ['torneo'];
      const [fila] = await tx`
        INSERT INTO problems (problem_number, title, slug, description_markdown, title_es,
          description_markdown_es, translated_at, difficulty_rating, time_limit_sec,
          memory_limit_mb, is_active, deactivation_reasons, fuente, fuente_url, rating_origen,
          casos_generados)
        VALUES (${p.numero}, ${p.titulo}, ${p.clave}, ${p.enunciado}, ${p.titulo_es},
          ${p.enunciado_es}, ${p.enunciado_es ? new Date() : null}, ${p.rating},
          ${p.limite_tiempo_s}, ${p.memoria_mb}, ${activo}, ${motivos}::text[], ${p.fuente},
          ${p.fuente_url}, ${p.rating_origen}, ${p.casos_generados})
        ON CONFLICT (slug) DO UPDATE SET
          problem_number = EXCLUDED.problem_number, title = EXCLUDED.title,
          description_markdown = EXCLUDED.description_markdown, title_es = EXCLUDED.title_es,
          description_markdown_es = EXCLUDED.description_markdown_es,
          translated_at = EXCLUDED.translated_at, difficulty_rating = EXCLUDED.difficulty_rating,
          time_limit_sec = EXCLUDED.time_limit_sec, memory_limit_mb = EXCLUDED.memory_limit_mb,
          is_active = EXCLUDED.is_active, deactivation_reasons = EXCLUDED.deactivation_reasons,
          fuente = EXCLUDED.fuente, fuente_url = EXCLUDED.fuente_url,
          rating_origen = EXCLUDED.rating_origen, casos_generados = EXCLUDED.casos_generados
        WHERE problems.fuente IS NOT NULL
        RETURNING id
      `;
      if (!fila) throw new Error(`${p.clave}: el slug pertenece a un problema que no es del banco`);
      // Los casos y las etiquetas se reemplazan enteros: el archivo manda.
      await tx`DELETE FROM test_cases WHERE problem_id = ${fila.id}`;
      for (const c of p.casos) {
        await tx`
          INSERT INTO test_cases (problem_id, input, expected_output, is_hidden)
          VALUES (${fila.id}, ${c.entrada}, ${c.salida}, ${c.oculto})
        `;
      }
      await tx`DELETE FROM problem_tags WHERE problem_id = ${fila.id}`;
      for (const t of p.tags) {
        const [tag] = await tx`
          INSERT INTO tags (name, description) VALUES (${t}, ${'Categoria ' + t})
          ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id
        `;
        await tx`INSERT INTO problem_tags (problem_id, tag_id) VALUES (${fila.id}, ${tag.id})`;
      }
    }
  });
  const [c] = await sql`
    SELECT count(*)::int AS activos FROM problems WHERE fuente IS NOT NULL AND is_active
  `;
  console.log(`Cargados. Problemas del banco local activos: ${c.activos}.`);
} finally {
  await sql.end();
}
