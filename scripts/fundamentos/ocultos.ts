// Genera los casos ocultos de Fundamentos: corre cada solucion de referencia en el PSeInt oficial
// (la Lambda del juez) y valida. Uso: ocultos.ts fundamentos-ocultos/lote-01.json [--cargar]

import { cargarConfig } from '../../supabase/functions/_compartido/config.ts';
import { conexion } from '../../supabase/functions/_compartido/db.ts';
import { type Ejemplo, invocadorLambda, juzgar } from '../../supabase/functions/_compartido/pseint.ts';
import { filasDeArchivos, validarOcultos } from './filas.ts';

interface Pedido {
  nivel: string;
  numero: number;
  solucion: string;
  entradas: string[];
  // Solucion sin atajos: comprueba que una solucion lenta pero correcta no se queda sin plazo.
  ingenua?: string;
}

// Margen para el plazo total de 7 s de la Lambda.
const TOPE_MS = 1500;

const [ruta] = Deno.args.filter((a) => !a.startsWith('--'));
const cargar = Deno.args.includes('--cargar');
if (!ruta) {
  console.error('Uso: ocultos.ts <lote.json> [--cargar]');
  Deno.exit(1);
}

const pedidos: Pedido[] = JSON.parse(await Deno.readTextFile(ruta));
const config = cargarConfig();
const invocar = invocadorLambda(config);
const filas = new Map(filasDeArchivos().map((f) => [`${f.nivel}:${f.numero}`, f]));

const cronometrar = async (codigo: string, entradas: string[]) => {
  const inicio = performance.now();
  const ejecuciones = await invocar(codigo, entradas);
  return { ejecuciones, ms: Math.round(performance.now() - inicio) };
};

// La primera llamada paga el arranque en frio: no cuenta para medir.
await invocar('Algoritmo calentar\nFinAlgoritmo', ['']);

const resultados: { nivel: string; numero: number; solucion: string; casos: Ejemplo[] }[] = [];
let rechazados = 0;
for (const p of pedidos) {
  const clave = `${p.nivel}:${p.numero}`;
  const fila = filas.get(clave);
  if (!fila) {
    console.error(`${clave}: no existe en los archivos`);
    rechazados++;
    continue;
  }
  const visibles = fila.ejemplos.map((e) => e.entrada);
  const { ejecuciones, ms } = await cronometrar(p.solucion, [...visibles, ...p.entradas]);
  const { casos, errores } = validarOcultos(fila, p.entradas, ejecuciones);
  if (ms > TOPE_MS) errores.push(`${clave}: la referencia tardo ${ms} ms`);

  if (p.ingenua && casos.length) {
    const todos = [...fila.ejemplos, ...casos];
    const lenta = await cronometrar(p.ingenua, todos.map((c) => c.entrada));
    const juicio = juzgar(todos, lenta.ejecuciones);
    if (juicio.veredicto !== 'ACEPTADO' || lenta.ms > TOPE_MS) {
      errores.push(`${clave}: la ingenua da ${juicio.veredicto} en ${lenta.ms} ms`);
    }
  }

  if (errores.length) {
    rechazados++;
    for (const e of errores) console.error(`  - ${e}`);
  } else {
    console.log(`${clave}: ${casos.length} ocultos en ${ms} ms`);
    resultados.push({ nivel: p.nivel, numero: p.numero, solucion: p.solucion, casos });
  }
}

const salida = ruta.replace(/lote-/, 'resultado-');
await Deno.writeTextFile(salida, JSON.stringify(resultados, null, 2));
console.log(`Validos: ${resultados.length}. Rechazados: ${rechazados}. Resultado en ${salida}.`);

if (cargar) {
  if (rechazados) {
    console.error('Hay rechazados: no se carga nada hasta corregirlos.');
    Deno.exit(1);
  }
  const sql = conexion(config.databaseUrl);
  try {
    await sql.begin(async (tx) => {
      for (const r of resultados) {
        await tx`
          UPDATE fundamentos_ejercicios
          SET casos_ocultos = ${JSON.stringify(r.casos)}::text::jsonb,
            solucion_referencia = ${r.solucion}
          WHERE nivel = ${r.nivel} AND numero = ${r.numero}
        `;
      }
    });
    console.log(`Cargados ${resultados.length} ejercicios.`);
  } finally {
    await sql.end();
  }
}
