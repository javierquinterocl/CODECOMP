// Generadores de pasos de los conceptos básicos de cada categoría (tabla, arreglo, grafo y pila).
// Funciones puras, con topes de entrada para que nunca generen demasiados pasos.

const entero = (texto, min, max, nombre) => {
  const n = Number(texto);
  if (String(texto ?? '').trim() === '' || !Number.isInteger(n) || n < min || n > max) {
    return { error: `${nombre} debe ser un entero entre ${min} y ${max}.` };
  }
  return { valor: n };
};

/* ── Traza de un ciclo: suma de 1 a n ── */
export const PSEUDO_TRAZA = ['suma ← 0', 'para i ← 1 hasta n:', '    suma ← suma + i', 'escribe suma'];
export const validarTraza = (n) => entero(n, 1, 12, 'n');
export const pasosTraza = (n) => {
  const filas = [];
  const pasos = [{ columnas: ['i', 'suma'], filas: [], linea: 0, nota: 'Antes del ciclo la suma vale 0.' }];
  let suma = 0;
  for (let i = 1; i <= n; i += 1) {
    pasos.push({ columnas: ['i', 'suma'], filas: [...filas, [i, suma]], actual: filas.length, linea: 1, nota: `Vuelta ${i}: i vale ${i}.` });
    suma += i;
    filas.push([i, suma]);
    pasos.push({ columnas: ['i', 'suma'], filas: [...filas], actual: filas.length - 1, linea: 2, nota: `suma ← ${suma - i} + ${i} = ${suma}.` });
  }
  pasos.push({ columnas: ['i', 'suma'], filas: [...filas], linea: 3, nota: `El ciclo terminó: se escribe ${suma}. Fíjate que es n·(n+1)/2 = ${(n * (n + 1)) / 2}.`, resultado: true });
  return pasos;
};

/* ── Simulación: Collatz ── */
export const PSEUDO_COLLATZ = ['mientras n ≠ 1:', '    si n es par:  n ← n / 2', '    si no:  n ← 3·n + 1', 'escribe la cantidad de pasos'];
export const validarCollatz = (n) => entero(n, 2, 1000, 'n');
export const pasosCollatz = (inicio) => {
  const columnas = ['paso', 'n', 'qué pasó'];
  const filas = [[0, inicio, 'inicio']];
  const pasos = [{ columnas, filas: [...filas], actual: 0, linea: 0, nota: `Empezamos con n = ${inicio}.` }];
  let n = inicio;
  let k = 0;
  while (n !== 1 && k < 60) {
    k += 1;
    const par = n % 2 === 0;
    const antes = n;
    n = par ? n / 2 : 3 * n + 1;
    filas.push([k, n, par ? `${antes} es par: /2` : `${antes} es impar: ·3+1`]);
    pasos.push({ columnas, filas: [...filas], actual: filas.length - 1, linea: par ? 1 : 2, nota: par ? `${antes} es par, así que lo dividimos: ${n}.` : `${antes} es impar: 3·${antes} + 1 = ${n}.` });
  }
  pasos.push({ columnas, filas: [...filas], linea: 3, nota: n === 1 ? `Llegamos a 1 en ${k} pasos. Simular es seguir las reglas al pie de la letra.` : 'Paramos a los 60 pasos para no llenar la pantalla.', resultado: true });
  return pasos;
};

/* ── Patrón con casos pequeños: apretones de mano ── */
export const PSEUDO_PATRON = ['para n ← 1 hasta N:', '    cuenta a mano los apretones entre n personas', '    compara con el caso anterior', 'adivina la fórmula y compruébala'];
export const validarPatron = (n) => entero(n, 3, 10, 'N');
export const pasosPatron = (N) => {
  const columnas = ['personas', 'apretones', 'aumentó en'];
  const filas = [];
  const pasos = [];
  for (let n = 1; n <= N; n += 1) {
    const total = (n * (n - 1)) / 2;
    filas.push([n, total, n === 1 ? '—' : `+${n - 1}`]);
    pasos.push({ columnas, filas: [...filas], actual: filas.length - 1, linea: n === 1 ? 0 : 2, nota: n === 1 ? 'Con 1 persona no hay apretones.' : `Con ${n} personas: la nueva saluda a las ${n - 1} que ya estaban, así que suma ${n - 1}.` });
  }
  pasos.push({ columnas, filas: [...filas], linea: 3, nota: `El aumento crece de uno en uno: la respuesta es 0 + 1 + 2 + … + (n−1) = n·(n−1)/2. Con n = 100 000 son ${(100000 * 99999) / 2} sin simular nada.`, resultado: true });
  return pasos;
};

/* ── MCD de Euclides ── */
export const PSEUDO_MCD = ['mientras b ≠ 0:', '    r ← a mod b', '    a ← b ;  b ← r', 'el MCD es a'];
export const validarMcd = (a, b) => {
  const x = entero(a, 1, 1000000, 'a');
  if (x.error) return x;
  const y = entero(b, 1, 1000000, 'b');
  if (y.error) return y;
  return { valor: { a: x.valor, b: y.valor } };
};
export const pasosMcd = ({ a, b }) => {
  const columnas = ['a', 'b', 'a mod b'];
  const filas = [];
  const pasos = [{ columnas, filas: [], linea: 0, nota: `Buscamos el MCD de ${a} y ${b}.` }];
  let x = a;
  let y = b;
  while (y !== 0) {
    const r = x % y;
    filas.push([x, y, r]);
    pasos.push({ columnas, filas: [...filas], actual: filas.length - 1, linea: 1, nota: `${x} mod ${y} = ${r}: el MCD de ${x} y ${y} es el mismo que el de ${y} y ${r}.` });
    x = y;
    y = r;
  }
  pasos.push({ columnas, filas: [...filas], linea: 3, nota: `b llegó a 0: el MCD es ${x}. Solo hicieron falta ${filas.length} divisiones.`, resultado: true });
  return pasos;
};

/* ── Voraz: dar cambio con la menor cantidad de monedas ── */
export const PSEUDO_MONEDAS = ['ordena las monedas de mayor a menor', 'para cada moneda m:', '    usa todas las que quepan:  k ← resto / m', '    resto ← resto − k·m'];
export const validarMonedas = (monto, monedasTexto) => {
  const x = entero(monto, 1, 100000, 'El monto');
  if (x.error) return x;
  const monedas = [...new Set(String(monedasTexto ?? '').split(/[\s,;]+/).filter(Boolean).map(Number))];
  if (!monedas.length || monedas.length > 8 || monedas.some((m) => !Number.isInteger(m) || m < 1 || m > 100000)) {
    return { error: 'Escribe de 1 a 8 monedas enteras positivas, por ejemplo: 1000 500 200 100 50.' };
  }
  return { valor: { monto: x.valor, monedas: monedas.sort((p, q) => q - p) } };
};
export const pasosMonedas = ({ monto, monedas }) => {
  const columnas = ['moneda', 'cuántas', 'falta'];
  const filas = [];
  const pasos = [{ columnas, filas: [], linea: 0, nota: `Hay que dar ${monto} con monedas de ${monedas.join(', ')}.` }];
  let resto = monto;
  let total = 0;
  for (const m of monedas) {
    const k = Math.floor(resto / m);
    resto -= k * m;
    total += k;
    filas.push([m, k, resto]);
    pasos.push({ columnas, filas: [...filas], actual: filas.length - 1, linea: k ? 2 : 1, nota: k ? `Caben ${k} de ${m}: faltan ${resto}.` : `${m} no cabe en ${resto + k * m}: seguimos con la siguiente.` });
  }
  pasos.push({ columnas, filas: [...filas], linea: 3, nota: resto === 0 ? `Usamos ${total} monedas. Con monedas como las colombianas, tomar siempre la mayor da el óptimo.` : `Sobran ${resto} que no se pueden dar con estas monedas: el voraz no siempre funciona.`, resultado: resto === 0 });
  return pasos;
};

/* ── Programación dinámica: formas de subir n escalones de 1 en 1 o de 2 en 2 ── */
export const PSEUDO_ESCALERAS = ['dp[0] ← 1 ;  dp[1] ← 1', 'para i ← 2 hasta n:', '    dp[i] ← dp[i − 1] + dp[i − 2]', 'la respuesta es dp[n]'];
export const validarEscaleras = (n) => entero(n, 2, 15, 'n');
export const pasosEscaleras = (n) => {
  const dp = [1, 1];
  const celdas = (marcas = {}) => Array.from({ length: n + 1 }, (_, k) => ({ v: k < dp.length ? dp[k] : '?', estado: marcas[k] ?? (k < dp.length ? 'bien' : 'normal') }));
  const pasos = [{ celdas: celdas(), punteros: {}, linea: 0, nota: 'Casos base: a 0 y a 1 escalón se llega de una sola forma.' }];
  for (let i = 2; i <= n; i += 1) {
    pasos.push({ celdas: celdas({ [i - 1]: 'compara', [i - 2]: 'compara' }), punteros: { i, 'i−1': i - 1, 'i−2': i - 2 }, linea: 2, nota: `Al escalón ${i} se llega desde el ${i - 1} (un paso) o desde el ${i - 2} (dos pasos): ${dp[i - 1]} + ${dp[i - 2]}.` });
    dp.push(dp[i - 1] + dp[i - 2]);
    pasos.push({ celdas: celdas({ [i]: 'compara' }), punteros: { i }, linea: 2, nota: `dp[${i}] = ${dp[i]}. Lo guardamos para no volver a calcularlo.` });
  }
  pasos.push({ celdas: celdas(), punteros: { n }, linea: 3, nota: `Hay ${dp[n]} formas de subir ${n} escalones, con solo ${n - 1} sumas. Sin guardar resultados serían miles de llamadas.`, resultado: true });
  return pasos;
};

/* ── DFS con pila ── */
export const PSEUDO_DFS = ['pila ← [inicio]', 'mientras la pila no esté vacía:', '    u ← saca el de arriba de la pila', '    si u ya fue visitado: siguiente', '    visita u ;  mete sus vecinos a la pila'];
export const pasosDfs = ({ nodos, aristas, inicio }) => {
  const vecinos = Object.fromEntries(nodos.map((x) => [x, []]));
  for (const [a, b] of aristas) { vecinos[a].push(b); vecinos[b].push(a); }
  for (const x of nodos) vecinos[x].sort((a, b) => b - a); // así sale primero el menor
  const orden = {};
  const foto = ({ actual = null, pila, arista = null }) => ({
    prefijo: '#', etiquetaLista: 'Pila (arriba a la derecha)',
    nodos: nodos.map((id) => ({ id, dist: orden[id] ?? null, estado: id === actual ? 'compara' : orden[id] !== undefined ? 'bien' : pila.includes(id) ? 'cola' : 'normal' })),
    aristas: aristas.map(([a, b]) => ({ a, b, activa: Boolean(arista) && ((arista[0] === a && arista[1] === b) || (arista[0] === b && arista[1] === a)) })),
    cola: [...pila],
  });
  const pila = [inicio];
  const pasos = [{ ...foto({ pila }), linea: 0, nota: `Metemos el inicio, ${inicio}, a la pila.` }];
  let k = 0;
  while (pila.length && pasos.length < 120) {
    const u = pila.pop();
    if (orden[u] !== undefined) {
      pasos.push({ ...foto({ pila }), linea: 3, nota: `${u} ya fue visitado: lo ignoramos.` });
      continue;
    }
    k += 1;
    orden[u] = k;
    const nuevos = vecinos[u].filter((v) => orden[v] === undefined);
    pila.push(...nuevos);
    pasos.push({ ...foto({ actual: u, pila }), linea: 4, nota: `Visitamos ${u} (es el ${k}.º). Metemos sus vecinos sin visitar: ${nuevos.length ? [...nuevos].reverse().join(', ') : 'ninguno'}.` });
  }
  pasos.push({ ...foto({ pila: [] }), linea: 1, nota: 'Pila vacía. DFS va lo más hondo posible antes de regresar: el número es el orden de visita.', resultado: true });
  return pasos;
};

/* ── Pila: paréntesis balanceados ── */
export const PSEUDO_PARENTESIS = ['para cada carácter c:', '    si abre:  apílalo', '    si cierra:  si la pila está vacía o no empareja → mal', '    si no:  desapila', 'bien solo si la pila termina vacía'];
const PAREJA = { ')': '(', ']': '[', '}': '{' };
export const validarParentesis = (texto) => {
  const s = String(texto ?? '').replace(/\s+/g, '');
  if (!s) return { error: 'Escribe paréntesis, corchetes o llaves, por ejemplo: ([]{}).' };
  if (/[^()[\]{}]/.test(s)) return { error: 'Usa solo ( ) [ ] { }.' };
  if (s.length > 16) return { error: 'Usa máximo 16 símbolos.' };
  return { valor: s };
};
export const pasosParentesis = (s) => {
  const pila = [];
  const celdas = (marcas) => [...s].map((v, k) => ({ v, estado: marcas[k] ?? 'normal' }));
  const pasos = [{ celdas: celdas({}), punteros: {}, pila: [], linea: 0, nota: 'Recorremos los símbolos de izquierda a derecha con una pila vacía.' }];
  for (let k = 0; k < s.length; k += 1) {
    const c = s[k];
    if (!PAREJA[c]) {
      pila.push(c);
      pasos.push({ celdas: celdas({ [k]: 'compara' }), punteros: { k }, pila: [...pila], linea: 1, nota: `«${c}» abre: lo apilamos.` });
    } else if (pila[pila.length - 1] !== PAREJA[c]) {
      pasos.push({ celdas: celdas({ [k]: 'error' }), punteros: { k }, pila: [...pila], linea: 2, nota: pila.length ? `«${c}» cierra, pero arriba está «${pila[pila.length - 1]}»: no emparejan. Mal balanceado.` : `«${c}» cierra y la pila está vacía: no hay qué cerrar. Mal balanceado.`, resultado: false });
      return pasos;
    } else {
      pila.pop();
      pasos.push({ celdas: celdas({ [k]: 'bien' }), punteros: { k }, pila: [...pila], linea: 3, nota: `«${c}» cierra al «${PAREJA[c]}» de arriba: desapilamos.` });
    }
  }
  const bien = pila.length === 0;
  pasos.push({ celdas: celdas({}), punteros: {}, pila: [...pila], linea: 4, nota: bien ? 'La pila quedó vacía: está bien balanceado.' : `Quedaron ${pila.length} sin cerrar: mal balanceado.`, resultado: bien });
  return pasos;
};

/* ── Recorrido acumulando: suma y máximo de n números ── */
export const PSEUDO_RECORRIDO = ['suma ← 0 ;  mayor ← a[0]', 'para i ← 0 hasta n − 1:', '    suma ← suma + a[i]', '    si a[i] > mayor:  mayor ← a[i]', 'escribe suma y mayor'];
export const validarRecorrido = (texto) => {
  const numeros = String(texto ?? '').split(/[\s,;]+/).filter(Boolean).map(Number);
  if (numeros.length < 1 || numeros.length > 12) return { error: 'Escribe entre 1 y 12 números separados por espacios.' };
  if (numeros.some((n) => !Number.isInteger(n) || Math.abs(n) > 9999)) return { error: 'Usa enteros entre −9999 y 9999.' };
  return { valor: numeros };
};
export const pasosRecorrido = (a) => {
  const celdas = (i, mejor) => a.map((v, k) => ({ v, estado: k === i ? 'compara' : k === mejor ? 'bien' : k < i ? 'descartada' : 'normal' }));
  let suma = 0;
  let mejor = 0;
  const pasos = [{ celdas: celdas(-1, 0), punteros: {}, linea: 0, nota: `Empezamos con suma = 0 y el mayor provisional en a[0] = ${a[0]}.` }];
  for (let i = 0; i < a.length; i += 1) {
    suma += a[i];
    pasos.push({ celdas: celdas(i, mejor), punteros: { i }, linea: 2, nota: `i = ${i}: sumamos ${a[i]}, la suma va en ${suma}.` });
    if (a[i] > a[mejor]) {
      mejor = i;
      pasos.push({ celdas: celdas(i, mejor), punteros: { i }, linea: 3, nota: `${a[i]} es mayor que el mayor anterior: ahora el mayor es ${a[i]}.` });
    }
  }
  pasos.push({ celdas: celdas(-1, mejor), punteros: {}, linea: 4, nota: `Con una sola pasada: suma = ${suma} y mayor = ${a[mejor]}.`, resultado: true });
  return pasos;
};
