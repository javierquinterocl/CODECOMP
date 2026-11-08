// Saca borradores del banco local de un paquete BOCA ya descomprimido (una carpeta por problema).
// Uso: deno run -A scripts/banco/extraer_boca.ts --dir <carpeta> --marcador <Score.html>
//   --clave icpc-latam-2024 --fuente "ICPC Latin American Regional 2024" --url <url> --numero 100001

import { parseArgs } from 'jsr:@std/cli@1.0.6/parse-args';
import { join } from 'jsr:@std/path@1.0.8';
import { type Caso, MAX_BYTES_CASO, MAX_CASOS, ratingDeMarcador } from './formato.ts';

const args = parseArgs(Deno.args, {
  string: ['dir', 'marcador', 'clave', 'fuente', 'url', 'numero', 'salida'],
});
for (const a of ['dir', 'marcador', 'clave', 'fuente', 'url', 'numero'] as const) {
  if (!args[a]) throw new Error(`Falta --${a}`);
}
const salidaDir = args.salida ?? join('banco', 'borradores');
await Deno.mkdir(salidaDir, { recursive: true });

const leer = (ruta: string) => Deno.readTextFile(ruta).catch(() => '');
const bytes = (t: string) => new TextEncoder().encode(t).length;

// Marcador BOCA: por equipo, una celda por problema con globo si lo resolvio.
const marcador = (html: string, letras: string[]) => {
  const equipos = new Map<string, boolean[]>();
  for (const fila of html.split('<tr')) {
    const m = fila.match(/> ([^<> ]+\/[A-Za-z]{2}) <\/td><td>[^<]*<\/td>([\s\S]*)/);
    if (!m) continue;
    const celdas = [...m[2].matchAll(/<td nowrap="nowrap">([\s\S]*?)<\/td>/g)].map((c) => c[1]);
    if (celdas.length < letras.length) continue;
    equipos.set(m[1], celdas.slice(0, letras.length).map((c) => c.includes('<img')));
  }
  return { total: equipos.size, por: (i: number) => [...equipos.values()].filter((e) => e[i]).length };
};

const texto_pdf = async (pdf: string) => {
  const r = await new Deno.Command('pdftotext', { args: ['-layout', pdf, '-'] }).output();
  return new TextDecoder().decode(r.stdout);
};

// Los ejemplos visibles se copian del enunciado al redactarlo; aqui solo van ocultos,
// repartidos por tamano (del mas pequeno al mas grande que cabe) para dejar sitio a 3 ejemplos.
const OCULTOS = MAX_CASOS - 3;
const elegirOcultos = (casos: Caso[]): Caso[] => {
  const caben = casos
    .filter((c) => bytes(c.entrada) <= MAX_BYTES_CASO && bytes(c.salida) <= MAX_BYTES_CASO)
    .sort((a, b) => a.entrada.length - b.entrada.length);
  if (caben.length <= OCULTOS) return caben;
  const indices = Array.from(
    { length: OCULTOS },
    (_, i) => Math.round(i * (caben.length - 1) / (OCULTOS - 1)),
  );
  return [...new Set(indices)].map((i) => caben[i]);
};

const letras = [...Deno.readDirSync(args.dir!)].filter((d) => d.isDirectory).map((d) => d.name)
  .sort();
const tablero = marcador(await leer(args.marcador!), letras);
let numero = Number(args.numero);
const informe: string[] = [];

for (const [i, letra] of letras.entries()) {
  const base = join(args.dir!, letra);
  const comparador = await leer(join(base, 'compare', 'cpp'));
  if (!comparador.includes('diff -q')) {
    informe.push(`${letra}: descartado, comparador propio`);
    numero++;
    continue;
  }
  const info = await leer(join(base, 'description', 'problem.info'));
  const titulo = info.match(/fullname="([^"]*)"/)?.[1] ?? letra;
  const descfile = info.match(/descfile=(\S+)/)?.[1] ?? `${letra}.pdf`;
  const pdf = await texto_pdf(join(base, 'description', descfile));
  const limites = (await leer(join(base, 'limits', 'cpp'))).match(/^echo (\d+)/gm) ?? [];
  const [tiempo, , memoria] = limites.map((l) => Number(l.slice(5)));

  const casos: Caso[] = [];
  for (const f of Deno.readDirSync(join(base, 'input'))) {
    const salida = await leer(join(base, 'output', f.name));
    if (salida) casos.push({ entrada: await leer(join(base, 'input', f.name)), salida, oculto: true });
  }
  const elegidos = elegirOcultos(casos);
  const resolvieron = tablero.por(i);
  const clave = `${args.clave}-${letra}`.toLowerCase();

  const borrador = {
    clave,
    numero: numero++,
    fuente: `${args.fuente}, problema ${letra}`,
    fuente_url: args.url,
    titulo,
    enunciado: '',
    titulo_es: null,
    enunciado_es: null,
    limite_tiempo_s: tiempo || 1,
    memoria_mb: Math.min(memoria || 256, 1024),
    rating: ratingDeMarcador(resolvieron, tablero.total),
    rating_origen: 'marcador',
    marcador: { equipos: tablero.total, resolvieron },
    categoria: '',
    tags: [],
    casos: elegidos,
    casos_generados: false,
    texto_pdf: pdf,
  };
  await Deno.writeTextFile(join(salidaDir, `${clave}.json`), JSON.stringify(borrador, null, 2));
  informe.push(
    `${letra}: ${titulo} | ${resolvieron}/${tablero.total} equipos -> ${borrador.rating} | ` +
      `${elegidos.length} ocultos de ${casos.length}`,
  );
}
console.log(`Marcador: ${tablero.total} equipos.`);
console.log(informe.join('\n'));
