// Comprueba DATABASE_URL tal como la usara la Edge Function.
import { cargarConfig } from '../../supabase/functions/_compartido/config.ts';
import { conexion } from '../../supabase/functions/_compartido/db.ts';
const config = cargarConfig();
const puerto = config.databaseUrl.match(/:(\d{4})\//)?.[1] ?? '?';
console.log('  puerto:', puerto);
const sql = conexion(config.databaseUrl);
const [v] = await sql`SELECT version() AS v`;
const [n] = await sql`SELECT count(*)::int AS n FROM problems`;
console.log('  postgres:', String(v.v).split(' ').slice(0, 2).join(' '));
console.log('  problemas visibles:', n.n);
await sql.end();
