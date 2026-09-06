import { cargarConfig } from '../../supabase/functions/_compartido/config.ts';
import { conexion } from '../../supabase/functions/_compartido/db.ts';
const sql = conexion(cargarConfig().databaseUrl);
const f = await sql`
  SELECT CASE
    WHEN difficulty_rating <= 900 THEN '800-900'
    WHEN difficulty_rating <= 1000 THEN '1000'
    WHEN difficulty_rating <= 1200 THEN '1100-1200'
    ELSE '1300+' END AS banda,
  count(*)::int AS n
  FROM problems WHERE is_active GROUP BY banda ORDER BY banda`;
for (const r of f) console.log(`  ${String(r.banda).padEnd(12)} ${r.n}`);
await sql.end();
