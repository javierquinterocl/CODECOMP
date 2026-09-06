import { cargarConfig } from '../../supabase/functions/_compartido/config.ts';
import { conexion } from '../../supabase/functions/_compartido/db.ts';
const sql = conexion(cargarConfig().databaseUrl);
const kb = (x: unknown) => (new TextEncoder().encode(JSON.stringify(x)).length / 1024).toFixed(0);

const actual = await sql`
  SELECT p.id, p.problem_number, p.title, p.slug, p.difficulty_rating,
    p.time_limit_sec, p.memory_limit_mb,
    COALESCE(json_agg(json_build_object('id', t.id, 'name', t.name) ORDER BY t.name)
      FILTER (WHERE t.id IS NOT NULL), '[]') AS tags
  FROM problems p LEFT JOIN problem_tags pt ON pt.problem_id = p.id
  LEFT JOIN tags t ON t.id = pt.tag_id WHERE p.is_active GROUP BY p.id`;

const delgado = await sql`
  SELECT p.problem_number, p.title, p.difficulty_rating, p.time_limit_sec, p.memory_limit_mb,
    COALESCE(array_agg(t.name ORDER BY t.name) FILTER (WHERE t.id IS NOT NULL), '{}') AS tags
  FROM problems p LEFT JOIN problem_tags pt ON pt.problem_id = p.id
  LEFT JOIN tags t ON t.id = pt.tag_id WHERE p.is_active GROUP BY p.id`;

console.log(`  payload actual   : ${kb(actual)} KB`);
console.log(`  payload delgado  : ${kb(delgado)} KB`);
console.log(`  ejemplo delgado  : ${JSON.stringify(delgado[0])}`);
await sql.end();
