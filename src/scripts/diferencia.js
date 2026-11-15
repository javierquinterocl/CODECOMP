// Primera diferencia entre la salida esperada y la del estudiante, para señalarla en el veredicto.
// Ignora espacios al final de cada línea y líneas vacías al final, como el juez de PSeInt.

const MAX_CARACTERES = 20000;

const lineasDe = (texto) => {
  const lineas = String(texto ?? '').slice(0, MAX_CARACTERES).replace(/\r\n?/g, '\n').split('\n')
    .map((l) => l.replace(/[ \t]+$/, ''));
  while (lineas.length && lineas[lineas.length - 1] === '') lineas.pop();
  return lineas;
};

/** Nombre legible de un carácter. */
export const nombreDeCaracter = (c) => {
  if (c === ' ') return 'un espacio';
  if (c === '\t') return 'un tabulador';
  return `«${c}»`;
};

/**
 * null si son iguales tras normalizar. Si no:
 * { tipo: 'letra', linea, columna, esperaba, escribiste } (caracteres o undefined),
 * { tipo: 'falta', linea } (tu salida tiene menos líneas) o { tipo: 'sobra', linea }.
 */
export const primeraDiferencia = (esperada, obtenida) => {
  const a = lineasDe(esperada);
  const b = lineasDe(obtenida);
  const comunes = Math.min(a.length, b.length);
  for (let i = 0; i < comunes; i += 1) {
    if (a[i] === b[i]) continue;
    let j = 0;
    while (j < a[i].length && a[i][j] === b[i][j]) j += 1;
    return { tipo: 'letra', linea: i + 1, columna: j + 1, esperaba: a[i][j], escribiste: b[i][j] };
  }
  if (a.length > b.length) return { tipo: 'falta', linea: b.length + 1 };
  if (b.length > a.length) return { tipo: 'sobra', linea: a.length + 1 };
  return null;
};

/** Frase para el estudiante. Con `null` (la diferencia está en algo que no comparamos) da una genérica. */
export const textoDeDiferencia = (d) => {
  if (!d) return 'La diferencia está en espacios o saltos de línea: revisa que tu salida tenga exactamente el formato pedido.';
  if (d.tipo === 'falta') return `A tu salida le falta desde la línea ${d.linea}.`;
  if (d.tipo === 'sobra') return `Tu salida tiene de más desde la línea ${d.linea}.`;
  const donde = `Línea ${d.linea}, letra ${d.columna}`;
  if (d.escribiste === undefined) return `${donde}: esperaba ${nombreDeCaracter(d.esperaba)}, pero tu línea termina ahí.`;
  if (d.esperaba === undefined) return `${donde}: la línea debía terminar ahí y escribiste ${nombreDeCaracter(d.escribiste)}.`;
  return `${donde}: esperaba ${nombreDeCaracter(d.esperaba)} y escribiste ${nombreDeCaracter(d.escribiste)}.`;
};
