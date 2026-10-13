// Elige el 10% de los problemas validados y lo reparte en archivos para el revisor.

import { createHash } from 'node:crypto';
import { CARPETA, leerLote, rutas } from './formato.ts';
import { idsDeLotes, leerInforme } from './estado.ts';
import { traduccionesDe } from './validar.ts';

const POR_ARCHIVO = 42;

// Orden fijo por hash: la misma muestra en cada corrida.
const orden = (numero: number): string => createHash('md5').update(`muestra-${numero}`).digest('hex');

const pares: { numero: number; texto: string }[] = [];
for (const id of await idsDeLotes()) {
  const informe = await leerInforme(id);
  if (!informe) continue;
  const traducciones = await traduccionesDe(id);
  for (const en of leerLote(await Deno.readTextFile(rutas(id).lote))) {
    const es = traducciones.get(en.numero);
    if (!es || informe.problemas[en.numero]?.estado !== 'ok') continue;
    pares.push({
      numero: en.numero,
      texto: [
        `@@@ PROBLEMA ${en.numero} @@@`,
        `--- INGLES ---\n${en.titulo}\n\n${en.enunciado}`,
        `--- ESPANOL ---\n${es.titulo}\n\n${es.enunciado}`,
        '',
      ].join('\n'),
    });
  }
}

pares.sort((a, b) => orden(a.numero).localeCompare(orden(b.numero)));
const elegidos = pares.slice(0, Math.ceil(pares.length / 10));

await Deno.mkdir(`${CARPETA}/revision`, { recursive: true });
const archivos: string[] = [];
for (let i = 0; i < elegidos.length; i += POR_ARCHIVO) {
  const k = String(i / POR_ARCHIVO + 1).padStart(2, '0');
  const ruta = `${CARPETA}/revision/muestra-${k}.txt`;
  await Deno.writeTextFile(ruta, elegidos.slice(i, i + POR_ARCHIVO).map((p) => p.texto).join('\n'));
  archivos.push(k);
}
console.log(JSON.stringify({ validados: pares.length, elegidos: elegidos.length, archivos }));
