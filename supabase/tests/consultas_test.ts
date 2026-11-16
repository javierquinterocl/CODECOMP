// Toda consulta del backend lleva al menos un parametro: con la conexion compartida (max: 1) del
// pooler en modo transaccion, una sin parametros junto a otras con parametros la deja colgada.
import { assertEquals } from 'jsr:@std/assert';
import { walk } from 'jsr:@std/fs/walk';

const RAIZ = new URL('../functions/', import.meta.url);

/** Cuerpo de cada sql`...` del archivo, respetando los ${...} anidados. */
const consultasDe = (fuente: string) => {
  const halladas: { linea: number; cuerpo: string }[] = [];
  for (const m of fuente.matchAll(/\b(?:sql|tx|ctx\.sql|sqlDirecto)`/g)) {
    let j = m.index! + m[0].length;
    let profundidad = 0;
    while (j < fuente.length) {
      if (fuente[j] === '\\') { j += 2; continue; }
      if (fuente.startsWith('${', j)) { profundidad++; j += 2; continue; }
      if (fuente[j] === '}' && profundidad) { profundidad--; j++; continue; }
      if (fuente[j] === '`' && !profundidad) break;
      j++;
    }
    const cuerpo = fuente.slice(m.index! + m[0].length, j);
    halladas.push({ linea: fuente.slice(0, m.index).split('\n').length, cuerpo });
  }
  return halladas;
};

Deno.test('ninguna consulta del backend va sin parametros', async () => {
  const sinParametros: string[] = [];
  for await (const archivo of walk(RAIZ, { exts: ['.ts'] })) {
    const fuente = await Deno.readTextFile(archivo.path);
    for (const { linea, cuerpo } of consultasDe(fuente)) {
      // Un fragmento vacio (sql``) se inserta dentro de otra consulta que si lleva parametros.
      if (!cuerpo.includes('${') && cuerpo.trim() !== '') sinParametros.push(`${archivo.path}:${linea}`);
    }
  }
  assertEquals(sinParametros, []);
});
