// Formato de los lotes de traduccion y reglas de validacion. Solo funciones puras.

export interface Problema {
  numero: number;
  md5?: string;
  literales: string[];
  titulo: string;
  enunciado: string;
}

export interface Veredicto {
  errores: string[];
  avisos: string[];
}

export const CARPETA = 'traduccion';

const CABECERA = /^@@@ PROBLEMA (\d+) @@@[ \t]*$/;

export const escribirLote = (problemas: Problema[]): string =>
  problemas.map((p) =>
    [
      `@@@ PROBLEMA ${p.numero} @@@`,
      ...(p.md5 ? [`MD5: ${p.md5}`] : []),
      ...(p.literales.length ? [`LITERALES: ${p.literales.join(' | ')}`] : []),
      `TITULO: ${p.titulo}`,
      'ENUNCIADO:',
      p.enunciado.trim(),
      '',
    ].join('\n')
  ).join('\n');

export const leerLote = (texto: string): Problema[] => {
  const problemas: Problema[] = [];
  let actual: Problema | null = null;
  let cuerpo: string[] | null = null;

  const cerrar = () => {
    if (!actual) return;
    actual.enunciado = (cuerpo ?? []).join('\n').trim();
    problemas.push(actual);
  };

  for (const linea of texto.replace(/\r\n/g, '\n').split('\n')) {
    const cabecera = linea.match(CABECERA);
    if (cabecera) {
      cerrar();
      actual = { numero: Number(cabecera[1]), literales: [], titulo: '', enunciado: '' };
      cuerpo = null;
      continue;
    }
    if (!actual) continue;
    if (cuerpo) {
      cuerpo.push(linea);
    } else if (linea.startsWith('MD5:')) {
      actual.md5 = linea.slice(4).trim();
    } else if (linea.startsWith('LITERALES:')) {
      actual.literales = linea.slice(10).split(' | ').map((x) => x.trim()).filter(Boolean);
    } else if (linea.startsWith('TITULO:')) {
      actual.titulo = linea.slice(7).trim();
    } else if (linea.trim() === 'ENUNCIADO:') {
      cuerpo = [];
    }
  }
  cerrar();
  return problemas;
};

const ETIQUETA = /<\/?(?:center|img|li|sub|sup|ul)\b[^<>]*>/g;
const PATRONES: [string, RegExp][] = [
  // Sin espacio pegado a los signos: asi un dolar de moneda no empareja con el de otra formula.
  ['formula', /\$(?!\s)[^$\n"]+?(?<!\s)\$/g],
  // Corta y sin espacios: un asterisco suelto (producto, C*++) no es variable. El sufijo ordinal se traduce.
  ['variable', /\*(?!(?:th|st|nd|rd)\*)[^\s*"]{1,20}\*/g],
  ['etiqueta', ETIQUETA],
  ['entidad', /&[a-zA-Z]+;|&#\d+;/g],
  ['operador', /<=|>=|[≤≥≠<>=]/g],
  ['numero', /\d+(?:\.\d+)?/g],
];

// Cada patron se extrae y se borra antes de buscar el siguiente.
export const protegidos = (texto: string): Record<string, string[]> => {
  const salida: Record<string, string[]> = {};
  let resto = texto;
  for (const [nombre, patron] of PATRONES) {
    salida[nombre] = resto.match(patron) ?? [];
    resto = resto.replace(patron, ' ');
  }
  return salida;
};

const COMILLAS = /"([^"\n]{1,60})"|“([^”\n]{1,60})”|«([^»\n]{1,60})»/g;

// Las etiquetas se quitan antes: sus atributos tambien llevan comillas.
export const entreComillas = (texto: string): string[] =>
  [...texto.replace(ETIQUETA, ' ').matchAll(COMILLAS)]
    .map((m) => (m[1] ?? m[2] ?? m[3]).trim()).filter(Boolean);

// Estricto: sale en las salidas, no tiene minusculas (YES, -1) o es una sola palabra con mayuscula.
const esEstricto = (literal: string, deSalida: Set<string>): boolean =>
  deSalida.has(literal.toLowerCase()) || !/[a-z]/.test(literal) ||
  (!/\s/.test(literal) && /[A-Z]/.test(literal));

const parrafos = (texto: string): string[] =>
  texto.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);

const diferencia = (a: string[], b: string[]): string[] => {
  const cuenta = new Map<string, number>();
  for (const x of b) cuenta.set(x, (cuenta.get(x) ?? 0) + 1);
  const sobran: string[] = [];
  for (const x of a) {
    const n = cuenta.get(x) ?? 0;
    if (n > 0) cuenta.set(x, n - 1);
    else sobran.push(x);
  }
  return sobran;
};

const muestra = (lista: string[]): string => lista.slice(0, 6).join('  ') + (lista.length > 6 ? ' …' : '');

export const validar = (en: Problema, es: Problema | undefined): Veredicto => {
  const errores: string[] = [];
  const avisos: string[] = [];
  if (!es) return { errores: ['sin traduccion'], avisos };

  if (!es.titulo) errores.push('titulo vacio');
  if (!es.enunciado) errores.push('enunciado vacio');
  if (es.enunciado && es.enunciado === en.enunciado.trim()) errores.push('el enunciado sigue en ingles');

  const tituloEn = protegidos(en.titulo).numero;
  const tituloEs = protegidos(es.titulo).numero;
  if (diferencia(tituloEn, tituloEs).length || diferencia(tituloEs, tituloEn).length) {
    errores.push('numeros del titulo distintos');
  }

  const pEn = protegidos(en.enunciado);
  const pEs = protegidos(es.enunciado);
  for (const [nombre] of PATRONES) {
    const faltan = diferencia(pEn[nombre], pEs[nombre]);
    const sobran = diferencia(pEs[nombre], pEn[nombre]);
    if (faltan.length) errores.push(`${nombre}: faltan ${muestra(faltan)}`);
    if (sobran.length) errores.push(`${nombre}: sobran ${muestra(sobran)}`);
  }

  const deSalida = new Set(en.literales.map((x) => x.toLowerCase()));
  const litEn = entreComillas(en.enunciado);
  const litEs = entreComillas(es.enunciado);
  const faltan = diferencia(litEn, litEs);
  const estrictos = faltan.filter((x) => esEstricto(x, deSalida));
  const suaves = faltan.filter((x) => !esEstricto(x, deSalida));
  if (estrictos.length) errores.push(`literal: faltan ${muestra(estrictos.map((x) => `"${x}"`))}`);
  if (suaves.length) avisos.push(`comillas traducidas: ${muestra(suaves.map((x) => `"${x}"`))}`);

  const nEn = parrafos(en.enunciado).length;
  const nEs = parrafos(es.enunciado).length;
  if (nEn !== nEs) errores.push(`parrafos: ${nEn} en ingles, ${nEs} en espanol`);

  return { errores, avisos };
};

export const idDeLote = (n: number): string => String(n).padStart(3, '0');

export const rutas = (id: string) => ({
  lote: `${CARPETA}/lotes/lote-${id}.txt`,
  es: `${CARPETA}/resultados/lote-${id}.es.txt`,
  rev: `${CARPETA}/resultados/lote-${id}.rev.txt`,
  validacion: `${CARPETA}/validacion/lote-${id}.json`,
});
