// Recalcula el nivel real de cada estudiante con todo su historial (migracion 016).
// Con --dry-run hace el calculo dentro de una transaccion y la deshace.
// Uso: deno run -A scripts/nivel/recalcular.ts [--dry-run]

import { cargarConfig } from '../../supabase/functions/_compartido/config.ts';
import { conexion } from '../../supabase/functions/_compartido/db.ts';
import { actualizarNivel } from '../../supabase/functions/_compartido/skillEngine.ts';

const simulacion = Deno.args.includes('--dry-run');
const sql = conexion(cargarConfig().databaseUrl);
const DESHACER = 'simulacion';

try {
  await sql.begin(async (tx) => {
    const usuarios = await tx`
      SELECT u.id, u.global_rating FROM users u
      WHERE EXISTS (SELECT 1 FROM submissions s WHERE s.user_id = u.id)
      ORDER BY u.created_at FOR UPDATE
    `;
    console.log(`Estudiantes con envios: ${usuarios.length}.`);
    for (const [i, u] of usuarios.entries()) {
      await actualizarNivel(tx, u.id as string);
      const [despues] = await tx`
        SELECT u.global_rating, u.nivel,
          (SELECT count(*)::int FROM resultados_problema r WHERE r.user_id = u.id) AS resultados
        FROM users u WHERE u.id = ${u.id}
      `;
      console.log(
        `  #${i + 1}: rating ${u.global_rating} -> ${despues.global_rating} ` +
          `(nivel ${Number(despues.nivel).toFixed(1)}, ${despues.resultados} resultados)`,
      );
    }
    if (simulacion) throw new Error(DESHACER);
  });
  console.log('Recalculo guardado.');
} catch (error) {
  if ((error as Error).message !== DESHACER) throw error;
  console.log('Simulacion: no se guardo nada.');
} finally {
  await sql.end();
}
