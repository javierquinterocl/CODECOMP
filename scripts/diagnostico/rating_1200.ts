// Separa los rating 1200 reales de los que puso el importador por defecto.
import { cargarConfig } from '../../supabase/functions/_compartido/config.ts';
import { conexion } from '../../supabase/functions/_compartido/db.ts';

type ProblemaCf = { name?: string; rating?: number };

const json = JSON.parse(await Deno.readTextFile('codeforces-problems.json'));
// nombre -> ratings oficiales de todos los problemas con ese nombre (vacio si ninguno tiene)
const porNombre = new Map<string, Set<number>>();
for (const p of json.result.problems as ProblemaCf[]) {
  const clave = String(p.name ?? '').trim().toLowerCase();
  const ratings = porNombre.get(clave) ?? new Set<number>();
  if (p.rating != null) ratings.add(p.rating);
  porNombre.set(clave, ratings);
}

const sql = conexion(cargarConfig().databaseUrl);
const filas = await sql`
  SELECT slug, title, difficulty_rating AS rating FROM problems WHERE is_active
`;
await sql.end();

const grupos: Record<string, string[]> = {};
const anotar = (grupo: string, slug: string) => (grupos[grupo] ??= []).push(slug);

for (const f of filas) {
  const titulo = String(f.title).trim().toLowerCase();
  const ratings = porNombre.get(titulo);
  if (f.rating !== 1200) {
    if (!ratings) anotar('otros: nombre ausente del json', f.slug);
    else if (ratings.has(f.rating)) anotar('otros: coincide con el json', f.slug);
    else anotar('otros: no coincide con el json', f.slug);
    continue;
  }
  if (titulo === 'none') anotar('1200: sin nombre (titulo "None")', f.slug);
  else if (!ratings) anotar('1200: nombre ausente del json', f.slug);
  else if (ratings.size === 0) anotar('1200: en el json pero sin rating oficial', f.slug);
  else if (ratings.has(1200)) anotar('1200: real (el json tiene 1200 con ese nombre)', f.slug);
  else if (ratings.size === 1) anotar('1200: inventado, recuperable (un solo rating)', f.slug);
  else anotar('1200: inventado, ambiguo (varios ratings)', f.slug);
}

console.log('  activos:', filas.length);
for (const [grupo, slugs] of Object.entries(grupos).sort()) {
  console.log(`  ${String(slugs.length).padStart(5)}  ${grupo}  ej: ${slugs.slice(0, 5).join(', ')}`);
}
