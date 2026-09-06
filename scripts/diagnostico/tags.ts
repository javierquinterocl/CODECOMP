import { cargarConfig } from '../../supabase/functions/_compartido/config.ts';
import { conexion } from '../../supabase/functions/_compartido/db.ts';
const sql = conexion(cargarConfig().databaseUrl);
const filas = await sql`
  SELECT t.name, count(pt.problem_id)::int AS n
  FROM tags t LEFT JOIN problem_tags pt ON pt.tag_id = t.id
  GROUP BY t.name ORDER BY n DESC`;
for (const f of filas) console.log(`  ${String(f.n).padStart(5)}  ${f.name}`);
await sql.end();
