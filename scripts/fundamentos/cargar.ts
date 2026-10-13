// Carga los ejercicios de Fundamentos en la base. Con --dry-run solo compara y cuenta.

import { cargarConfig } from '../../supabase/functions/_compartido/config.ts';
import { conexion } from '../../supabase/functions/_compartido/db.ts';
import { diferencias, type Fila, filasDeArchivos, validar } from './filas.ts';

const simulacion = Deno.args.includes('--dry-run');

const filas = filasDeArchivos();
const errores = validar(filas);
if (errores.length) {
  console.error(`Los archivos no pasan la validacion (${errores.length}):`);
  for (const e of errores) console.error(`  - ${e}`);
  Deno.exit(1);
}
console.log(`Ejercicios en los archivos: ${filas.length}.`);

const sql = conexion(cargarConfig().databaseUrl);

// Compara la base con los archivos, campo a campo.
const comparar = async (): Promise<{ iguales: number; distintos: number; faltan: number }> => {
  const enBase = await sql`
    SELECT nivel, numero, tema, dificultad, titulo, resumen, descripcion, entrada, salida,
      ejemplos, pista_concepto
    FROM fundamentos_ejercicios WHERE is_active
  `;
  const porClave = new Map(enBase.map((f) => [`${f.nivel}:${f.numero}`, f]));
  const cuenta = { iguales: 0, distintos: 0, faltan: 0 };
  for (const fila of filas) {
    const base = porClave.get(`${fila.nivel}:${fila.numero}`);
    if (!base) cuenta.faltan++;
    else if (diferencias(fila, base).length) cuenta.distintos++;
    else cuenta.iguales++;
  }
  return cuenta;
};

const informar = async (momento: string) => {
  const c = await comparar();
  console.log(
    `${momento}: ${c.iguales} iguales a los archivos, ${c.distintos} distintos, ${c.faltan} sin cargar.`,
  );
  const porNivel = await sql`
    SELECT nivel, count(*)::int AS total FROM fundamentos_ejercicios
    WHERE is_active GROUP BY nivel ORDER BY nivel
  `;
  console.log(`  Activos por nivel: ${porNivel.map((f) => `${f.nivel} ${f.total}`).join(', ') || 'ninguno'}.`);
};

try {
  await informar('Antes');

  if (simulacion) {
    console.log('Simulacion: no se escribio nada.');
  } else {
    await sql.begin(async (tx) => {
      // Va como texto: si el parametro se declara jsonb, el cliente lo codifica otra vez.
      const datos = JSON.stringify(filas satisfies Fila[]);
      await tx`
        INSERT INTO fundamentos_ejercicios (nivel, numero, tema, dificultad, titulo, resumen,
          descripcion, entrada, salida, ejemplos, pista_concepto, is_active)
        SELECT v.nivel, v.numero, v.tema, v.dificultad, v.titulo, v.resumen,
          ARRAY(SELECT jsonb_array_elements_text(v.descripcion)), v.entrada, v.salida,
          v.ejemplos, v.pista_concepto, true
        FROM jsonb_to_recordset(${datos}::text::jsonb) AS v(nivel text, numero int, tema text,
          dificultad smallint, titulo text, resumen text, descripcion jsonb, entrada text,
          salida text, ejemplos jsonb, pista_concepto text)
        ON CONFLICT (nivel, numero) DO UPDATE SET
          tema = EXCLUDED.tema, dificultad = EXCLUDED.dificultad, titulo = EXCLUDED.titulo,
          resumen = EXCLUDED.resumen, descripcion = EXCLUDED.descripcion,
          entrada = EXCLUDED.entrada, salida = EXCLUDED.salida, ejemplos = EXCLUDED.ejemplos,
          pista_concepto = EXCLUDED.pista_concepto, is_active = true
      `;
      // Lo que ya no esta en los archivos se desactiva; no se borra porque puede tener avance.
      const retirados = await tx`
        UPDATE fundamentos_ejercicios AS e SET is_active = false
        WHERE e.is_active AND NOT EXISTS (
          SELECT 1 FROM jsonb_to_recordset(${datos}::text::jsonb) AS v(nivel text, numero int)
          WHERE v.nivel = e.nivel AND v.numero = e.numero
        )
      `;
      if (retirados.count) console.log(`Desactivados por no estar en los archivos: ${retirados.count}.`);
    });
    await informar('Despues');
  }
} finally {
  await sql.end();
}
