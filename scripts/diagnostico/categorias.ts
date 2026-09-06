import { cargarConfig } from '../../supabase/functions/_compartido/config.ts';
import { conexion } from '../../supabase/functions/_compartido/db.ts';
const sql = conexion(cargarConfig().databaseUrl);
const filas = await sql`
  SELECT p.difficulty_rating AS r,
    COALESCE(json_agg(t.name) FILTER (WHERE t.id IS NOT NULL), '[]') AS tags
  FROM problems p
  LEFT JOIN problem_tags pt ON pt.problem_id = p.id
  LEFT JOIN tags t ON t.id = pt.tag_id
  WHERE p.is_active GROUP BY p.id`;
await sql.end();
const { categoriaDeProblema } = await import('../../src/scripts/problemsData.js');
const cuenta: Record<string, number> = {};
for (const f of filas) {
  const c = categoriaDeProblema({ tags: f.tags, dificultadRating: f.r });
  cuenta[c] = (cuenta[c] ?? 0) + 1;
}
for (const [k, v] of Object.entries(cuenta).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${k.padEnd(24)} ${String(v).padStart(5)}`);
}
console.log('  ' + '-'.repeat(30));
console.log('  total'.padEnd(26) + String(filas.length).padStart(5));
