// Generadores de pasos de las lecciones: a partir de una entrada devuelven la lista completa de
// estados a dibujar, con la línea de pseudocódigo activa y una nota. Funciones puras y probadas.

/* ── Dos punteros: ¿es palíndromo? ── */

export const PSEUDO_PALINDROMO = [
  'i ← 0 ;  j ← n − 1',
  'mientras i < j:',
  '    si s[i] ≠ s[j]:  no es palíndromo',
  '    i ← i + 1 ;  j ← j − 1',
  'es palíndromo',
];

/** Deja solo letras y números, en minúscula. Error si queda vacío o pasa de 16. */
export const validarPalindromo = (texto) => {
  const limpio = String(texto ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9ñ]/g, '');
  if (!limpio) return { error: 'Escribe una palabra o frase con letras.' };
  if (limpio.length > 16) return { error: 'Usa máximo 16 letras para que quepa en la pantalla.' };
  return { valor: limpio };
};

export const pasosPalindromo = (s) => {
  const celdas = (marcas = {}) => [...s].map((v, k) => ({ v, estado: marcas[k] ?? 'normal' }));
  const pasos = [];
  let i = 0;
  let j = s.length - 1;
  const ok = {};
  pasos.push({ celdas: celdas(), punteros: { i, j }, linea: 0, nota: `Un puntero al inicio (i = 0) y otro al final (j = ${j}).` });
  while (i < j) {
    pasos.push({ celdas: celdas({ ...ok, [i]: 'compara', [j]: 'compara' }), punteros: { i, j }, linea: 1, nota: `Comparamos s[${i}] = «${s[i]}» con s[${j}] = «${s[j]}».` });
    if (s[i] !== s[j]) {
      pasos.push({ celdas: celdas({ ...ok, [i]: 'error', [j]: 'error' }), punteros: { i, j }, linea: 2, nota: `«${s[i]}» ≠ «${s[j]}»: no es palíndromo. Basta una pareja distinta para saberlo.`, resultado: false });
      return pasos;
    }
    ok[i] = 'bien';
    ok[j] = 'bien';
    i += 1;
    j -= 1;
    pasos.push({ celdas: celdas(ok), punteros: { i, j }, linea: 3, nota: 'Son iguales: los dos punteros avanzan hacia el centro.' });
  }
  pasos.push({ celdas: celdas(Object.fromEntries([...s].map((_, k) => [k, 'bien']))), punteros: {}, linea: 4, nota: `Los punteros se cruzaron sin encontrar diferencias: «${s}» es palíndromo. Hicimos ${Math.floor(s.length / 2)} comparaciones.`, resultado: true });
  return pasos;
};

/* ── Búsqueda binaria ── */

export const PSEUDO_BINARIA = [
  'lo ← 0 ;  hi ← n − 1',
  'mientras lo ≤ hi:',
  '    mid ← (lo + hi) / 2',
  '    si a[mid] = x:  encontrado',
  '    si a[mid] < x:  lo ← mid + 1',
  '    si no:  hi ← mid − 1',
  'x no está',
];

/** "1 3 5 7, 5" → arreglo ordenado (2 a 16 números distintos) y objetivo. */
export const validarBinaria = (arregloTexto, objetivoTexto) => {
  const numeros = String(arregloTexto ?? '').split(/[\s,;]+/).filter(Boolean).map(Number);
  if (numeros.length < 2 || numeros.length > 16) return { error: 'Escribe entre 2 y 16 números separados por espacios.' };
  if (numeros.some((n) => !Number.isInteger(n) || Math.abs(n) > 999)) return { error: 'Usa números enteros entre −999 y 999.' };
  const objetivo = Number(objetivoTexto);
  if (String(objetivoTexto ?? '').trim() === '' || !Number.isInteger(objetivo)) return { error: 'Escribe el número entero que quieres buscar.' };
  const ordenados = [...new Set(numeros)].sort((a, b) => a - b);
  return { valor: { arreglo: ordenados, objetivo, reordenado: ordenados.join() !== numeros.join() } };
};

export const pasosBinaria = ({ arreglo, objetivo }) => {
  const celdas = (lo, hi, marcas = {}) => arreglo.map((v, k) => ({ v, estado: marcas[k] ?? (k < lo || k > hi ? 'descartada' : 'normal') }));
  const pasos = [];
  let lo = 0;
  let hi = arreglo.length - 1;
  let vueltas = 0;
  pasos.push({ celdas: celdas(lo, hi), punteros: { lo, hi }, linea: 0, nota: `Buscamos ${objetivo}. El rango posible es todo el arreglo: de lo = 0 a hi = ${hi}.` });
  while (lo <= hi) {
    vueltas += 1;
    const mid = Math.floor((lo + hi) / 2);
    pasos.push({ celdas: celdas(lo, hi, { [mid]: 'compara' }), punteros: { lo, mid, hi }, linea: 2, nota: `Vuelta ${vueltas}: miramos el centro, mid = ${mid}, donde está ${arreglo[mid]}.` });
    if (arreglo[mid] === objetivo) {
      pasos.push({ celdas: celdas(lo, hi, { [mid]: 'bien' }), punteros: { mid }, linea: 3, nota: `¡Encontrado en la posición ${mid} con solo ${vueltas} ${vueltas === 1 ? 'vuelta' : 'vueltas'}! Una búsqueda uno por uno habría mirado ${mid + 1}.`, resultado: true });
      return pasos;
    }
    if (arreglo[mid] < objetivo) {
      lo = mid + 1;
      pasos.push({ celdas: celdas(lo, hi), punteros: { lo, hi }, linea: 4, nota: `${arreglo[mid]} < ${objetivo}: todo lo de la izquierda también es menor. Descartamos esa mitad (lo = ${lo}).` });
    } else {
      hi = mid - 1;
      pasos.push({ celdas: celdas(lo, hi), punteros: { lo, hi }, linea: 5, nota: `${arreglo[mid]} > ${objetivo}: todo lo de la derecha también es mayor. Descartamos esa mitad (hi = ${hi}).` });
    }
  }
  pasos.push({ celdas: celdas(lo, hi), punteros: {}, linea: 6, nota: `El rango quedó vacío (lo > hi): ${objetivo} no está. Bastaron ${vueltas} ${vueltas === 1 ? 'vuelta' : 'vueltas'}.`, resultado: false });
  return pasos;
};

/* ── Criba de Eratóstenes ── */

export const PSEUDO_CRIBA = [
  'marca de 2 a n como posibles primos',
  'para p ← 2 mientras p · p ≤ n:',
  '    si p no está tachado:',
  '        tacha p·p, p·p + p, p·p + 2p, … hasta n',
  'los que quedan sin tachar son primos',
];

export const validarCriba = (texto) => {
  const n = Number(texto);
  if (!Number.isInteger(n) || n < 10 || n > 100) return { error: 'Escribe un número entero entre 10 y 100.' };
  return { valor: n };
};

export const pasosCriba = (n) => {
  const estado = Array.from({ length: n + 1 }, (_, k) => (k < 2 ? 'nulo' : 'normal'));
  const foto = (marcas = {}) => estado.slice(1).map((e, k) => ({ v: k + 1, estado: marcas[k + 1] ?? e }));
  const pasos = [{ celdas: foto(), linea: 0, nota: `Empezamos suponiendo que todos los números de 2 a ${n} pueden ser primos.` }];
  let tachados = 0;
  for (let p = 2; p * p <= n; p += 1) {
    if (estado[p] === 'tachado') {
      pasos.push({ celdas: foto({ [p]: 'compara' }), linea: 2, nota: `${p} ya está tachado (es múltiplo de un primo menor): lo saltamos.` });
      continue;
    }
    estado[p] = 'bien';
    pasos.push({ celdas: foto({ [p]: 'compara' }), linea: 2, nota: `${p} sigue sin tachar: es primo. Tachamos sus múltiplos desde ${p * p} (los menores ya los tachó un primo más pequeño).` });
    for (let m = p * p; m <= n; m += p) {
      if (estado[m] !== 'tachado') tachados += 1;
      estado[m] = 'tachado';
      pasos.push({ celdas: foto({ [p]: 'compara', [m]: 'error' }), linea: 3, nota: `Tachamos ${m} = ${p} × ${m / p}.` });
    }
  }
  for (let k = 2; k <= n; k += 1) if (estado[k] === 'normal') estado[k] = 'bien';
  const primos = estado.filter((e) => e === 'bien').length;
  pasos.push({ celdas: foto(), linea: 4, nota: `Listo: hay ${primos} primos hasta ${n}. Tachamos ${tachados} números sin dividir ni una sola vez.`, resultado: true });
  return pasos;
};

/* ── BFS: distancias mínimas en un grafo sin pesos ── */

export const PSEUDO_BFS = [
  'dist[inicio] ← 0 ;  cola ← [inicio]',
  'mientras la cola no esté vacía:',
  '    u ← saca el primero de la cola',
  '    para cada vecino v de u:',
  '        si v no tiene distancia:  dist[v] ← dist[u] + 1 ;  mete v a la cola',
  'dist guarda los pasos mínimos desde el inicio',
];

/** "1-2, 1-3, 2-4" con nodos del 1 al 8 y el nodo de inicio. */
export const validarBfs = (aristasTexto, inicioTexto) => {
  const partes = String(aristasTexto ?? '').split(/[,;\n]+/).map((x) => x.trim()).filter(Boolean);
  if (!partes.length || partes.length > 14) return { error: 'Escribe entre 1 y 14 aristas, por ejemplo: 1-2, 1-3, 2-4.' };
  const aristas = [];
  for (const parte of partes) {
    const m = parte.match(/^(\d+)\s*[-–]\s*(\d+)$/);
    if (!m) return { error: `«${parte}» no es una arista: escríbela como 1-2.` };
    const [a, b] = [Number(m[1]), Number(m[2])];
    if (a < 1 || a > 8 || b < 1 || b > 8) return { error: 'Usa nodos del 1 al 8.' };
    if (a === b) return { error: `La arista ${a}-${b} une un nodo consigo mismo.` };
    if (!aristas.some(([x, y]) => (x === a && y === b) || (x === b && y === a))) aristas.push([a, b]);
  }
  const nodos = [...new Set(aristas.flat())].sort((a, b) => a - b);
  const inicio = Number(inicioTexto);
  if (!nodos.includes(inicio)) return { error: `El inicio debe ser uno de los nodos: ${nodos.join(', ')}.` };
  return { valor: { nodos, aristas, inicio } };
};

export const pasosBfs = ({ nodos, aristas, inicio }) => {
  const vecinos = Object.fromEntries(nodos.map((n) => [n, []]));
  for (const [a, b] of aristas) { vecinos[a].push(b); vecinos[b].push(a); }
  for (const n of nodos) vecinos[n].sort((a, b) => a - b);
  const dist = {};
  const hechos = new Set();
  const foto = ({ actual = null, arista = null, cola }) => ({
    nodos: nodos.map((id) => ({
      id, dist: dist[id] ?? null,
      estado: id === actual ? 'compara' : hechos.has(id) ? 'bien' : cola.includes(id) ? 'cola' : 'normal',
    })),
    aristas: aristas.map(([a, b]) => ({ a, b, activa: Boolean(arista) && ((arista[0] === a && arista[1] === b) || (arista[0] === b && arista[1] === a)) })),
    cola: [...cola],
  });
  dist[inicio] = 0;
  const cola = [inicio];
  const pasos = [{ ...foto({ cola }), linea: 0, nota: `El inicio es ${inicio}, a distancia 0. Lo ponemos en la cola.` }];
  while (cola.length) {
    const u = cola.shift();
    pasos.push({ ...foto({ actual: u, cola }), linea: 2, nota: `Sacamos ${u} de la cola (distancia ${dist[u]}). Revisamos sus vecinos: ${vecinos[u].join(', ') || 'ninguno'}.` });
    for (const v of vecinos[u]) {
      if (dist[v] === undefined) {
        dist[v] = dist[u] + 1;
        cola.push(v);
        pasos.push({ ...foto({ actual: u, arista: [u, v], cola }), linea: 4, nota: `${v} no tenía distancia: queda a ${dist[v]} ${dist[v] === 1 ? 'paso' : 'pasos'} y entra a la cola.` });
      } else {
        pasos.push({ ...foto({ actual: u, arista: [u, v], cola }), linea: 3, nota: `${v} ya tiene distancia ${dist[v]}: no lo volvemos a meter.` });
      }
    }
    hechos.add(u);
  }
  const alcanzados = Object.keys(dist).length;
  const sinLlegar = nodos.length - alcanzados;
  pasos.push({ ...foto({ cola: [] }), linea: 5, nota: `Cola vacía. Cada nodo muestra su distancia mínima desde ${inicio}${sinLlegar ? `; ${sinLlegar} no se alcanzan porque no están conectados` : ''}.`, resultado: true });
  return pasos;
};
