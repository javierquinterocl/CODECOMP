// Carga en la base las traducciones validadas. Con --dry-run solo cuenta.

import { cargarConfig } from '../../supabase/functions/_compartido/config.ts';
import { conexion } from '../../supabase/functions/_compartido/db.ts';
import { leerLote, rutas } from './formato.ts';
import { idsDeLotes, leerInforme } from './estado.ts';
import { traduccionesDe } from './validar.ts';

const TANDA = 100;
const simulacion = Deno.args.includes('--dry-run');

const filas: { numero: number; md5: string; titulo: string; enunciado: string }[] = [];
let sinValidar = 0;
for (const id of await idsDeLotes()) {
  const informe = await leerInforme(id);
  if (!informe) continue;
  const traducciones = await traduccionesDe(id);
  for (const en of leerLote(await Deno.readTextFile(rutas(id).lote))) {
    const es = traducciones.get(en.numero);
    if (!es || !en.md5 || informe.problemas[en.numero]?.estado !== 'ok') {
      sinValidar++;
      continue;
    }
    filas.push({ numero: en.numero, md5: en.md5, titulo: es.titulo, enunciado: es.enunciado });
  }
}

console.log(`Validados para cargar: ${filas.length}. Sin validar (no se cargan): ${sinValidar}.`);

const sql = conexion(cargarConfig().databaseUrl);
try {
  // El md5 descarta los problemas cuyo ingles cambio desde la exportacion.
  const vigentes = await sql`
    SELECT problem_number, md5(description_markdown) AS md5
    FROM problems WHERE is_active AND problem_number IS NOT NULL
  `;
  const md5Actual = new Map(vigentes.map((f) => [Number(f.problem_number), String(f.md5)]));
  const cargables = filas.filter((f) => md5Actual.get(f.numero) === f.md5);
  console.log(`Coinciden con el ingles actual: ${cargables.length} de ${filas.length}.`);

  if (simulacion) {
    console.log('Simulacion: no se escribio nada.');
  } else {
    let escritas = 0;
    for (let i = 0; i < cargables.length; i += TANDA) {
      const tanda = cargables.slice(i, i + TANDA);
      const res = await sql`
        UPDATE problems AS p
        SET title_es = v.titulo, description_markdown_es = v.enunciado, translated_at = now()
        FROM (
          SELECT * FROM unnest(
            ${tanda.map((f) => f.numero)}::int[],
            ${tanda.map((f) => f.md5)}::text[],
            ${tanda.map((f) => f.titulo)}::text[],
            ${tanda.map((f) => f.enunciado)}::text[]
          ) AS t(numero, md5, titulo, enunciado)
        ) AS v
        WHERE p.problem_number = v.numero AND p.is_active
          AND md5(p.description_markdown) = v.md5
      `;
      escritas += res.count;
    }
    console.log(`Filas actualizadas: ${escritas}.`);
  }
} finally {
  await sql.end();
}
