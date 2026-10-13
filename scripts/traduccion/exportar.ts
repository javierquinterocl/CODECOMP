// Exporta los problemas activos a lotes de texto para traducir. Solo lee de la base.

import { cargarConfig } from '../../supabase/functions/_compartido/config.ts';
import { conexion } from '../../supabase/functions/_compartido/db.ts';
import { CARPETA, entreComillas, escribirLote, idDeLote, type Problema, rutas } from './formato.ts';
import { idsDeLotes } from './estado.ts';

const MAX_PROBLEMAS = 40;
const MAX_CARACTERES = 50_000;
const TAMANO_MUESTRA = 20;

interface Fila extends Problema {
  rating: number;
}

const leerActivos = async (): Promise<Fila[]> => {
  const sql = conexion(cargarConfig().databaseUrl);
  try {
    // Lineas cortas de las salidas esperadas: de ahi salen los literales (YES, NO...).
    const filas = await sql`
      SELECT p.problem_number, p.title, p.description_markdown, p.difficulty_rating,
        md5(p.description_markdown) AS md5,
        COALESCE((
          SELECT array_agg(DISTINCT lower(btrim(linea)))
          FROM test_cases tc,
            LATERAL regexp_split_to_table(left(tc.expected_output, 400), E'\n') AS linea
          WHERE tc.problem_id = p.id AND length(btrim(linea)) BETWEEN 1 AND 60
            AND btrim(linea) ~ '[A-Za-z]'
        ), '{}') AS salidas
      FROM problems p
      WHERE p.is_active AND p.problem_number IS NOT NULL
      ORDER BY p.problem_number
    `;
    return filas.map((f) => {
      const salidas = new Set(f.salidas as string[]);
      const enunciado = String(f.description_markdown ?? '').replace(/\r\n/g, '\n');
      const literales = [...new Set(entreComillas(enunciado))]
        .filter((x) => salidas.has(x.toLowerCase()));
      return {
        numero: Number(f.problem_number),
        md5: String(f.md5),
        literales,
        titulo: String(f.title),
        enunciado,
        rating: Number(f.difficulty_rating),
      };
    });
  } finally {
    await sql.end();
  }
};

const empaquetar = (filas: Fila[]): Fila[][] => {
  const lotes: Fila[][] = [];
  let actual: Fila[] = [];
  let caracteres = 0;
  for (const fila of filas) {
    const largo = fila.enunciado.length + fila.titulo.length;
    if (actual.length && (actual.length >= MAX_PROBLEMAS || caracteres + largo > MAX_CARACTERES)) {
      lotes.push(actual);
      actual = [];
      caracteres = 0;
    }
    actual.push(fila);
    caracteres += largo;
  }
  if (actual.length) lotes.push(actual);
  return lotes;
};

// Muestra variada: casos especiales primero y el resto repartido por rating y largo.
const elegirMuestra = (filas: Fila[]): Fila[] => {
  const elegidos = new Map<number, Fila>();
  const tomar = (candidatas: Fila[], n: number) => {
    for (const f of candidatas) {
      if (n <= 0) break;
      if (elegidos.has(f.numero)) continue;
      elegidos.set(f.numero, f);
      n--;
    }
  };
  const porLargo = [...filas].sort((a, b) => b.enunciado.length - a.enunciado.length);
  const medianos = filas.filter((f) => f.enunciado.length > 800 && f.enunciado.length < 2500);
  tomar(porLargo, 1);
  tomar(medianos.filter((f) => /\$[^$\n]+\$/.test(f.enunciado)), 3);
  tomar(medianos.filter((f) => /<(?:sup|sub|ul|img)\b/.test(f.enunciado)), 2);
  tomar(medianos.filter((f) => f.literales.length > 0), 2);

  const resto = TAMANO_MUESTRA - elegidos.size;
  const porRating = [...filas].sort((a, b) => a.rating - b.rating || a.numero - b.numero);
  const cuantiles = [0.1, 0.5, 0.9];
  for (let i = 0; i < resto; i++) {
    const desde = Math.floor((i * porRating.length) / resto);
    const hasta = Math.floor(((i + 1) * porRating.length) / resto);
    const tramo = porRating.slice(desde, hasta).sort((a, b) => a.enunciado.length - b.enunciado.length);
    const centro = Math.floor(tramo.length * cuantiles[i % cuantiles.length]);
    tomar([...tramo.slice(centro), ...tramo.slice(0, centro)], 1);
  }
  return [...elegidos.values()].sort((a, b) => a.numero - b.numero);
};

const main = async () => {
  const esMuestra = Deno.args.includes('--muestra');
  const forzar = Deno.args.includes('--forzar');
  await Deno.mkdir(`${CARPETA}/lotes`, { recursive: true });
  await Deno.mkdir(`${CARPETA}/resultados`, { recursive: true });

  const filas = await leerActivos();
  const total = filas.reduce((n, f) => n + f.enunciado.length + f.titulo.length, 0);
  console.log(`Activos: ${filas.length}, ${total} caracteres.`);

  if (esMuestra) {
    const muestra = elegirMuestra(filas);
    await Deno.writeTextFile(rutas('muestra').lote, escribirLote(muestra));
    console.log(`Muestra de ${muestra.length} problemas en ${rutas('muestra').lote}`);
    for (const f of muestra) {
      console.log(`  ${String(f.numero).padStart(5)}  rating ${f.rating}  ${f.enunciado.length} car.`);
    }
    return;
  }

  // La composicion de los lotes no puede cambiar a mitad de la traduccion.
  if ((await idsDeLotes()).length && !forzar) {
    console.error('Ya hay lotes exportados. Usa --forzar solo si vas a empezar de cero.');
    Deno.exit(1);
  }
  const lotes = empaquetar(filas);
  for (const [i, lote] of lotes.entries()) {
    await Deno.writeTextFile(rutas(idDeLote(i + 1)).lote, escribirLote(lote));
  }
  const tamanos = lotes.map((l) => l.length);
  console.log(
    `${lotes.length} lotes; entre ${Math.min(...tamanos)} y ${Math.max(...tamanos)} problemas cada uno.`,
  );
};

if (import.meta.main) await main();
