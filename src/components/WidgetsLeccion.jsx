import { useId, useMemo, useState } from 'react';

// Ejemplos interactivos simples de "Lo básico" de cada categoría. Lo que escribe el estudiante
// siempre se muestra como texto de React (nunca como HTML).

const Campo = ({ label, valor, onCambio, ayuda, ancho = 'normal', tipo = 'text' }) => {
  const id = useId();
  return (
    <label className={`nb-leccion-campo is-${ancho}`} htmlFor={id}>
      <span className="nb-leccion-campo-label">{label}</span>
      <input id={id} type={tipo} className="nb-input" value={valor} maxLength={120} onChange={(e) => onCambio(e.target.value)} aria-describedby={ayuda ? `${id}-ayuda` : undefined} />
      {ayuda && <span id={`${id}-ayuda`} className="nb-ayuda">{ayuda}</span>}
    </label>
  );
};

const Resultado = ({ children, error = false }) => (
  <div className={`nb-widget-resultado${error ? ' is-fail' : ''}`} aria-live="polite">{children}</div>
);

/* ── Principiante: cómo se leen los datos ── */
export const LectorEntrada = () => {
  const [texto, setTexto] = useState('3\n10 20 30');
  const fichas = texto.split(/\s+/).filter(Boolean).slice(0, 30);
  const n = Number(fichas[0]);
  const valido = Number.isInteger(n) && n >= 0;
  return (
    <div className="nb-widget">
      <label className="nb-leccion-campo is-ancho">
        <span className="nb-leccion-campo-label">Entrada (como la escribe el juez)</span>
        <textarea className="nb-input nb-widget-area" rows={3} value={texto} maxLength={200} onChange={(e) => setTexto(e.target.value)} />
      </label>
      <p className="nb-widget-nota">El programa lee <code>n</code> y luego <code>n</code> números. Espacios y saltos de línea dan igual: <code>cin</code> lee ficha por ficha.</p>
      <ol className="nb-widget-fichas">
        {fichas.map((f, k) => {
          const nombre = k === 0 ? 'n' : valido && k <= n ? `a[${k - 1}]` : 'sobra';
          return <li key={k} className={nombre === 'sobra' ? 'is-sobra' : ''}><span>{f}</span><small>{nombre}</small></li>;
        })}
      </ol>
      <Resultado error={!valido || fichas.length - 1 < n}>
        {!valido ? 'La primera ficha debe ser un entero: es n.' : fichas.length - 1 < n ? `Faltan ${n - (fichas.length - 1)} números: el programa se quedaría esperando.` : fichas.length - 1 > n ? `Leímos los ${n} números; lo que sobra no se lee.` : `Perfecto: n = ${n} y se leen exactamente ${n} números.`}
      </Resultado>
    </div>
  );
};

/* ── Principiante y Matemáticas: desbordamiento ── */
const LIMITE_INT = 2n ** 31n;
const comoInt = (x) => {
  const r = ((x + LIMITE_INT) % (2n * LIMITE_INT) + 2n * LIMITE_INT) % (2n * LIMITE_INT);
  return r - LIMITE_INT;
};
export const Desbordamiento = () => {
  const [a, setA] = useState('100000');
  const [b, setB] = useState('100000');
  const ok = /^-?\d{1,12}$/.test(a.trim()) && /^-?\d{1,12}$/.test(b.trim());
  const real = ok ? BigInt(a.trim()) * BigInt(b.trim()) : 0n;
  const enInt = comoInt(real);
  return (
    <div className="nb-widget">
      <div className="nb-widget-fila">
        <Campo label="a" valor={a} onCambio={setA} ancho="corto" />
        <span className="nb-widget-op" aria-hidden="true">×</span>
        <Campo label="b" valor={b} onCambio={setB} ancho="corto" />
      </div>
      {ok ? (
        <Resultado error={enInt !== real}>
          <span>Resultado real: <strong>{real.toString()}</strong></span>
          <span>Guardado en <code>int</code> (32 bits): <strong>{enInt.toString()}</strong>{enInt !== real ? ' ← ¡se desbordó!' : ' (cabe)'}</span>
          <span>Guardado en <code>long long</code> (64 bits): <strong>{real.toString()}</strong></span>
        </Resultado>
      ) : <Resultado error>Escribe enteros de hasta 12 cifras.</Resultado>}
    </div>
  );
};

/* ── Ad-Hoc y Paradigmas: ¿alcanza el tiempo? ── */
const COMPLEJIDADES = [
  { nombre: 'O(log n)', log10: (n) => Math.log10(Math.max(1, Math.log2(n))) },
  { nombre: 'O(n)', log10: (n) => Math.log10(n) },
  { nombre: 'O(n log n)', log10: (n) => Math.log10(n * Math.max(1, Math.log2(n))) },
  { nombre: 'O(n²)', log10: (n) => 2 * Math.log10(n) },
  { nombre: 'O(n³)', log10: (n) => 3 * Math.log10(n) },
  { nombre: 'O(2ⁿ)', log10: (n) => n * Math.log10(2) },
];
const potencia = (l) => (l < 6 ? Math.round(10 ** l).toLocaleString('es-CO') : `≈ 10^${Math.round(l)}`);
export const EstimadorOps = () => {
  const [texto, setTexto] = useState('100000');
  const n = Number(texto);
  const ok = Number.isInteger(n) && n >= 1 && n <= 1e9;
  return (
    <div className="nb-widget">
      <Campo label="Tamaño n" valor={texto} onCambio={setTexto} ayuda="Un entero entre 1 y 1 000 000 000. Un computador hace unas 10⁸ operaciones por segundo." ancho="corto" />
      {ok ? (
        <table className="nb-widget-tabla">
          <thead><tr><th scope="col">Complejidad</th><th scope="col">Operaciones</th><th scope="col">¿Pasa en 1 s?</th></tr></thead>
          <tbody>
            {COMPLEJIDADES.map((c) => {
              const l = c.log10(n);
              return (
                <tr key={c.nombre} className={l <= 8 ? 'is-ok' : 'is-fail'}>
                  <td><code>{c.nombre}</code></td><td>{potencia(l)}</td><td>{l <= 8 ? 'Sí' : l <= 9 ? 'Justo, arriesgado' : 'No'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : <Resultado error>Escribe un entero entre 1 y 1 000 000 000.</Resultado>}
    </div>
  );
};

/* ── Cadenas: índices y subcadenas ── */
export const ExploradorCadena = () => {
  const [s, setS] = useState('codecomp');
  const [l, setL] = useState('2');
  const [r, setR] = useState('5');
  const texto = s.slice(0, 20);
  const i = Number(l);
  const j = Number(r);
  const rango = Number.isInteger(i) && Number.isInteger(j) && i >= 0 && j < texto.length && i <= j;
  return (
    <div className="nb-widget">
      <div className="nb-widget-fila">
        <Campo label="Cadena s" valor={s} onCambio={setS} ayuda="Hasta 20 caracteres." />
        <Campo label="Desde l" valor={l} onCambio={setL} ancho="corto" />
        <Campo label="Hasta r" valor={r} onCambio={setR} ancho="corto" />
      </div>
      <ol className="nb-vista-arreglo">
        {[...texto].map((c, k) => (
          <li key={k} className={`nb-vista-celda${rango && k >= i && k <= j ? ' is-compara' : ''}`}>
            <span className="nb-vista-indice">{k}</span>
            <span className="nb-vista-valor">{c === ' ' ? '␣' : c}</span>
          </li>
        ))}
      </ol>
      <Resultado error={!rango}>
        <span>Longitud: <strong>{texto.length}</strong> · índices de 0 a {Math.max(0, texto.length - 1)}</span>
        {rango ? (
          <>
            <span>s[{i}] = «{texto[i]}» · subcadena s[{i}..{j}] = «{texto.slice(i, j + 1)}» ({j - i + 1} letras)</span>
            <span>En C++: <code>s.substr({i}, {j - i + 1})</code> · En Python: <code>s[{i}:{j + 1}]</code></span>
          </>
        ) : <span>El rango debe cumplir 0 ≤ l ≤ r ≤ {texto.length - 1}.</span>}
      </Resultado>
    </div>
  );
};

/* ── Cadenas y Estructuras de datos: contar con un arreglo o un mapa ── */
export const Frecuencias = ({ modo = 'letras' }) => {
  const [texto, setTexto] = useState(modo === 'letras' ? 'programacion competitiva' : 'el gato y el perro y el raton');
  const conteo = useMemo(() => {
    const mapa = new Map();
    const piezas = modo === 'letras'
      ? [...texto.toLowerCase()].filter((c) => /\p{L}|\d/u.test(c))
      : texto.toLowerCase().split(/[^\p{L}\d]+/u).filter(Boolean);
    for (const p of piezas.slice(0, 200)) mapa.set(p, (mapa.get(p) ?? 0) + 1);
    return [...mapa.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 12);
  }, [texto, modo]);
  const max = conteo[0]?.[1] ?? 1;
  return (
    <div className="nb-widget">
      <Campo label={modo === 'letras' ? 'Texto' : 'Palabras'} valor={texto} onCambio={setTexto} ancho="ancho" />
      {conteo.length ? (
        <ul className="nb-widget-barras" aria-label="Conteo">
          {conteo.map(([clave, n]) => (
            <li key={clave}>
              <code>{clave}</code>
              <span className="nb-widget-barra" style={{ '--avance': `${(n / max) * 100}%` }} aria-hidden="true" />
              <strong>{n}</strong>
            </li>
          ))}
        </ul>
      ) : <Resultado error>Escribe algo para contar.</Resultado>}
      <p className="nb-widget-nota">{modo === 'letras' ? 'Con 26 letras basta un arreglo cnt[26]: cnt[c − \'a\']++ por cada letra.' : 'Con palabras se usa un mapa: map<string,int> en C++ o un diccionario en Python.'}</p>
    </div>
  );
};

/* ── Matemáticas: divisores y módulo ── */
export const Divisores = () => {
  const [texto, setTexto] = useState('36');
  const [modTexto, setModTexto] = useState('7');
  const n = Number(texto);
  const m = Number(modTexto);
  const ok = Number.isInteger(n) && n >= 1 && n <= 1e9;
  const divisores = useMemo(() => {
    if (!ok) return [];
    const chicos = [];
    const grandes = [];
    for (let d = 1; d * d <= n; d += 1) if (n % d === 0) { chicos.push(d); if (d * d !== n) grandes.unshift(n / d); }
    return [...chicos, ...grandes];
  }, [n, ok]);
  return (
    <div className="nb-widget">
      <div className="nb-widget-fila">
        <Campo label="n" valor={texto} onCambio={setTexto} ancho="corto" ayuda="Hasta 1 000 000 000." />
        <Campo label="Módulo m" valor={modTexto} onCambio={setModTexto} ancho="corto" />
      </div>
      {ok ? (
        <Resultado>
          <span>Divisores ({divisores.length}): <strong>{divisores.slice(0, 40).join(', ')}{divisores.length > 40 ? '…' : ''}</strong></span>
          <span>{divisores.length === 2 ? `${n} es primo.` : n === 1 ? '1 no es primo ni compuesto.' : `${n} es compuesto.`} Solo probamos d hasta √n ≈ {Math.floor(Math.sqrt(n))}: cada divisor chico trae su pareja n / d.</span>
          {Number.isInteger(m) && m >= 1 && <span>{n} mod {m} = <strong>{n % m}</strong> (el resto de dividir {n} entre {m}).</span>}
        </Resultado>
      ) : <Resultado error>Escribe un entero entre 1 y 1 000 000 000.</Resultado>}
    </div>
  );
};

/* ── Estructuras de datos: pila y cola a mano ── */
export const PilaCola = ({ modo = 'pila' }) => {
  const [datos, setDatos] = useState([3, 7]);
  const [siguiente, setSiguiente] = useState(12);
  const [mensaje, setMensaje] = useState('');
  const esPila = modo === 'pila';
  const meter = () => {
    if (datos.length >= 8) { setMensaje('Llena para el ejemplo: saca alguno primero.'); return; }
    setDatos((d) => [...d, siguiente]);
    setMensaje(`Entró ${siguiente} ${esPila ? 'arriba' : 'al final'}.`);
    setSiguiente((s) => (s * 7) % 50 + 1);
  };
  const sacar = () => {
    if (!datos.length) { setMensaje(`La ${modo} está vacía.`); return; }
    const sale = esPila ? datos[datos.length - 1] : datos[0];
    setDatos((d) => (esPila ? d.slice(0, -1) : d.slice(1)));
    setMensaje(`Salió ${sale}: ${esPila ? 'el último que entró' : 'el primero que entró'}.`);
  };
  return (
    <div className="nb-widget">
      <div className={`nb-widget-estructura is-${modo}`} aria-label={`${modo}: ${datos.join(', ') || 'vacía'}`}>
        {datos.length ? datos.map((v, k) => <span key={`${v}-${k}`} className={(esPila ? k === datos.length - 1 : k === 0) ? 'is-sale' : ''}>{v}</span>) : <em>vacía</em>}
      </div>
      <div className="nb-widget-fila">
        <button type="button" className="nb-repro-btn is-principal" onClick={meter}>{esPila ? 'Apilar' : 'Encolar'} {siguiente}</button>
        <button type="button" className="nb-repro-btn" onClick={sacar}>{esPila ? 'Desapilar' : 'Desencolar'}</button>
      </div>
      <Resultado>{mensaje || (esPila ? 'Una pila es LIFO: sale primero el último que entró (resaltado).' : 'Una cola es FIFO: sale primero el que llegó antes (resaltado).')}</Resultado>
    </div>
  );
};

/* ── Grafos: representaciones ── */
export const RepresentacionGrafo = ({ validar }) => {
  const [texto, setTexto] = useState('1-2, 1-3, 2-3, 3-4');
  const v = validar(texto, '1');
  const grafo = v.valor;
  return (
    <div className="nb-widget">
      <Campo label="Aristas" valor={texto} onCambio={setTexto} ancho="ancho" ayuda="Nodos del 1 al 8, por ejemplo: 1-2, 2-3." />
      {v.error ? <Resultado error>{v.error}</Resultado> : (
        <div className="nb-widget-dos">
          <div>
            <span className="nb-leccion-kicker">Lista de adyacencia</span>
            <ul className="nb-widget-lista">
              {grafo.nodos.map((n) => {
                const vec = grafo.aristas.flatMap(([a, b]) => (a === n ? [b] : b === n ? [a] : [])).sort((x, y) => x - y);
                return <li key={n}><strong>{n}</strong> → {vec.join(', ')}</li>;
              })}
            </ul>
          </div>
          <div>
            <span className="nb-leccion-kicker">Matriz de adyacencia</span>
            <table className="nb-widget-matriz">
              <thead><tr><th scope="col" aria-label="nodo" />{grafo.nodos.map((n) => <th key={n} scope="col">{n}</th>)}</tr></thead>
              <tbody>
                {grafo.nodos.map((a) => (
                  <tr key={a}>
                    <th scope="row">{a}</th>
                    {grafo.nodos.map((b) => {
                      const hay = grafo.aristas.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
                      return <td key={b} className={hay ? 'is-on' : ''}>{hay ? 1 : 0}</td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <p className="nb-widget-nota">La lista gasta memoria según las aristas (la usamos casi siempre); la matriz gasta n² pero responde «¿hay arista entre a y b?» al instante.</p>
    </div>
  );
};

/* ── Geometría: puntos, distancia y orientación ── */
const PUNTOS_INICIALES = { ax: '-4', ay: '-2', bx: '3', by: '1', cx: '0', cy: '5' };
export const PlanoPuntos = () => {
  const [p, setP] = useState(PUNTOS_INICIALES);
  const num = (k) => Number(p[k]);
  const ok = Object.keys(p).every((k) => /^-?\d{1,2}$/.test(p[k].trim()) && Math.abs(num(k)) <= 10);
  const A = { x: num('ax'), y: num('ay') };
  const B = { x: num('bx'), y: num('by') };
  const C = { x: num('cx'), y: num('cy') };
  const cruz = (B.x - A.x) * (C.y - A.y) - (B.y - A.y) * (C.x - A.x);
  const dist = Math.hypot(B.x - A.x, B.y - A.y);
  const giro = cruz > 0 ? 'a la izquierda (antihorario)' : cruz < 0 ? 'a la derecha (horario)' : 'ninguno: los tres puntos son colineales';
  const px = (x) => 110 + x * 10;
  const py = (y) => 110 - y * 10;
  const campo = (k, label) => <Campo key={k} label={label} valor={p[k]} onCambio={(v) => setP((q) => ({ ...q, [k]: v }))} ancho="mini" />;
  return (
    <div className="nb-widget">
      <div className="nb-widget-fila">
        {campo('ax', 'A.x')}{campo('ay', 'A.y')}{campo('bx', 'B.x')}{campo('by', 'B.y')}{campo('cx', 'C.x')}{campo('cy', 'C.y')}
      </div>
      {ok ? (
        <div className="nb-widget-dos">
          <svg className="nb-widget-plano" viewBox="0 0 220 220" role="img" aria-label={`A(${A.x},${A.y}), B(${B.x},${B.y}), C(${C.x},${C.y}); el giro es ${giro}`}>
            {Array.from({ length: 21 }, (_, k) => <line key={`v${k}`} x1={10 + k * 10} y1="10" x2={10 + k * 10} y2="210" className={k === 10 ? 'is-eje' : ''} />)}
            {Array.from({ length: 21 }, (_, k) => <line key={`h${k}`} x1="10" y1={10 + k * 10} x2="210" y2={10 + k * 10} className={k === 10 ? 'is-eje' : ''} />)}
            <polyline points={`${px(A.x)},${py(A.y)} ${px(B.x)},${py(B.y)} ${px(C.x)},${py(C.y)}`} className="nb-widget-trazo" />
            {[['A', A], ['B', B], ['C', C]].map(([n, q]) => (
              <g key={n}><rect x={px(q.x) - 4} y={py(q.y) - 4} width="8" height="8" /><text x={px(q.x) + 6} y={py(q.y) - 6}>{n}</text></g>
            ))}
          </svg>
          <Resultado>
            <span>Distancia A→B = √(({B.x}−{A.x})² + ({B.y}−{A.y})²) = <strong>{dist.toFixed(3)}</strong></span>
            <span>Producto cruz (B−A)×(C−A) = <strong>{cruz}</strong></span>
            <span>Yendo de A a B y luego a C, el giro es <strong>{giro}</strong>.</span>
            <span>Con coordenadas enteras el producto cruz es exacto: sin decimales ni errores de precisión.</span>
          </Resultado>
        </div>
      ) : <Resultado error>Usa coordenadas enteras entre −10 y 10.</Resultado>}
    </div>
  );
};
