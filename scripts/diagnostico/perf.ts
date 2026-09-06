import { cargarConfig } from '../../supabase/functions/_compartido/config.ts';
import { conexion } from '../../supabase/functions/_compartido/db.ts';
const sql = conexion(cargarConfig().databaseUrl);

const cronometrar = async (nombre: string, fn: () => Promise<unknown>) => {
  await fn();
  const t0 = performance.now();
  const r = await fn() as unknown[];
  console.log(`  ${nombre.padEnd(46)} ${(performance.now() - t0).toFixed(0).padStart(6)} ms  ${Array.isArray(r) ? r.length : ''} filas`);
};

await cronometrar('consulta actual (json_agg objetos, limit 500)', () => sql`
  SELECT p.id, p.problem_number, p.title, p.slug, p.difficulty_rating,
    p.time_limit_sec, p.memory_limit_mb,
    COALESCE(json_agg(json_build_object('id', t.id, 'name', t.name) ORDER BY t.name)
      FILTER (WHERE t.id IS NOT NULL), '[]') AS tags
  FROM problems p
  LEFT JOIN problem_tags pt ON pt.problem_id = p.id
  LEFT JOIN tags t ON t.id = pt.tag_id
  WHERE p.is_active AND ('' = '' OR true)
  GROUP BY p.id ORDER BY p.problem_number NULLS LAST, p.id LIMIT 500 OFFSET 0`);

await cronometrar('lo mismo con OFFSET 3000 (paginacion profunda)', () => sql`
  SELECT p.id, p.problem_number, p.title, p.slug, p.difficulty_rating,
    p.time_limit_sec, p.memory_limit_mb,
    COALESCE(json_agg(json_build_object('id', t.id, 'name', t.name) ORDER BY t.name)
      FILTER (WHERE t.id IS NOT NULL), '[]') AS tags
  FROM problems p
  LEFT JOIN problem_tags pt ON pt.problem_id = p.id
  LEFT JOIN tags t ON t.id = pt.tag_id
  WHERE p.is_active
  GROUP BY p.id ORDER BY p.problem_number NULLS LAST, p.id LIMIT 500 OFFSET 3000`);

await cronometrar('adelgazada: sin slug, sin UUIDs, tags como texto', () => sql`
  SELECT p.problem_number, p.title, p.difficulty_rating,
    p.time_limit_sec, p.memory_limit_mb,
    COALESCE(array_agg(t.name ORDER BY t.name) FILTER (WHERE t.id IS NOT NULL), '{}') AS tags
  FROM problems p
  LEFT JOIN problem_tags pt ON pt.problem_id = p.id
  LEFT JOIN tags t ON t.id = pt.tag_id
  WHERE p.is_active
  GROUP BY p.id ORDER BY p.problem_number NULLS LAST LIMIT 500`);

await cronometrar('TODO el catalogo de una sola vez (3626, adelgazado)', () => sql`
  SELECT p.problem_number, p.title, p.difficulty_rating,
    p.time_limit_sec, p.memory_limit_mb,
    COALESCE(array_agg(t.name ORDER BY t.name) FILTER (WHERE t.id IS NOT NULL), '{}') AS tags
  FROM problems p
  LEFT JOIN problem_tags pt ON pt.problem_id = p.id
  LEFT JOIN tags t ON t.id = pt.tag_id
  WHERE p.is_active
  GROUP BY p.id ORDER BY p.problem_number NULLS LAST`);

await sql.end();
