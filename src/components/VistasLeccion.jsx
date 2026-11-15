// Vistas de la visualización de las lecciones. Cada estado lleva texto además del color.

const TEXTO_ESTADO = {
  compara: 'comparando', bien: 'correcto', error: 'distinto', descartada: 'descartada',
  normal: '', nulo: '', cola: 'en cola',
};
const LEYENDA = {
  arreglo: [['compara', 'Se compara'], ['bien', 'Coincide / encontrado'], ['error', 'Distinto'], ['descartada', 'Descartado']],
  cuadricula: [['compara', 'Primo actual'], ['bien', 'Primo'], ['error', 'Tachando'], ['tachado', 'Tachado']],
  grafo: [['compara', 'Se procesa'], ['cola', 'En espera'], ['bien', 'Visitado'], ['normal', 'Sin visitar']],
  tabla: [['compara', 'Fila nueva']],
  pila: [['compara', 'Se lee'], ['bien', 'Empareja'], ['error', 'No empareja']],
};

export const Leyenda = ({ tipo }) => (
  <ul className="nb-vista-leyenda" aria-label="Qué significa cada color">
    {LEYENDA[tipo].map(([estado, texto]) => (
      <li key={estado}><span className={`nb-vista-muestra is-${estado}`} aria-hidden="true" />{texto}</li>
    ))}
  </ul>
);

/** Celdas en fila (se parten en varias si no caben) con las flechas de los punteros debajo. */
export const VistaArreglo = ({ paso }) => {
  const debajo = {};
  for (const [nombre, k] of Object.entries(paso.punteros ?? {})) (debajo[k] ||= []).push(nombre);
  return (
    <ol className="nb-vista-arreglo">
      {paso.celdas.map((c, k) => (
        <li key={k} className={`nb-vista-celda is-${c.estado}`}>
          <span className="nb-vista-indice">{k}</span>
          <span className="nb-vista-valor">{c.v}</span>
          <span className="nb-sr">{TEXTO_ESTADO[c.estado]}</span>
          <span className="nb-vista-punteros">{(debajo[k] ?? []).map((p) => <span key={p}>↑{p}</span>)}</span>
        </li>
      ))}
    </ol>
  );
};

/** Números del 1 a n en filas de 10. */
export const VistaCuadricula = ({ paso }) => (
  <ol className="nb-vista-cuadricula">
    {paso.celdas.map((c) => (
      <li key={c.v} className={`nb-vista-num is-${c.estado}`}>
        {c.v}
        <span className="nb-sr">{c.estado === 'tachado' ? 'tachado' : TEXTO_ESTADO[c.estado]}</span>
      </li>
    ))}
  </ol>
);

/** Grafo en círculo (SVG) con la distancia de cada nodo y la cola debajo. */
export const VistaGrafo = ({ paso }) => {
  const r = 120;
  const centro = 150;
  const pos = Object.fromEntries(paso.nodos.map((n, k) => {
    const angulo = (2 * Math.PI * k) / paso.nodos.length - Math.PI / 2;
    return [n.id, { x: centro + r * Math.cos(angulo), y: centro + r * Math.sin(angulo) }];
  }));
  const resumen = paso.nodos.map((n) => `nodo ${n.id}: ${n.dist === null ? 'sin distancia' : `distancia ${n.dist}`}${TEXTO_ESTADO[n.estado] ? `, ${TEXTO_ESTADO[n.estado]}` : ''}`).join('; ');
  return (
    <div className="nb-vista-grafo">
      <svg viewBox="0 0 300 300" role="img" aria-label={resumen}>
        {paso.aristas.map((a) => (
          <line key={`${a.a}-${a.b}`} x1={pos[a.a].x} y1={pos[a.a].y} x2={pos[a.b].x} y2={pos[a.b].y} className={a.activa ? 'is-activa' : ''} />
        ))}
        {paso.nodos.map((n) => (
          <g key={n.id} className={`nb-vista-nodo is-${n.estado}`} transform={`translate(${pos[n.id].x} ${pos[n.id].y})`}>
            <rect x="-20" y="-20" width="40" height="40" />
            <text y="1">{n.id}</text>
            <text y="36" className="nb-vista-dist">{n.dist === null ? '–' : `${paso.prefijo ?? 'd='}${n.dist}`}</text>
          </g>
        ))}
      </svg>
      <div className="nb-vista-cola">
        <span className="nb-vista-cola-label">{paso.etiquetaLista ?? 'Cola'}</span>
        {paso.cola.length ? paso.cola.map((id, k) => <span key={`${id}-${k}`} className="nb-vista-cola-item">{id}</span>) : <span className="nb-vista-cola-vacia">vacía</span>}
      </div>
    </div>
  );
};

/** Tabla de variables que crece fila por fila (trazas, simulaciones, MCD, monedas). */
export const VistaTabla = ({ paso }) => (
  <div className="nb-vista-tabla-caja">
    <table className="nb-widget-tabla nb-vista-tabla">
      <thead><tr>{paso.columnas.map((c) => <th key={c} scope="col">{c}</th>)}</tr></thead>
      <tbody>
        {paso.filas.length ? paso.filas.map((f, k) => (
          <tr key={k} className={k === paso.actual ? 'is-compara' : ''}>{f.map((v, j) => <td key={j}>{v}</td>)}</tr>
        )) : <tr><td colSpan={paso.columnas.length}>(todavía vacía)</td></tr>}
      </tbody>
    </table>
  </div>
);

/** Símbolos en fila y la pila al lado, con el tope a la derecha. */
export const VistaPila = ({ paso }) => (
  <div className="nb-vista-pila-caja">
    <VistaArreglo paso={paso} />
    <div className="nb-vista-cola">
      <span className="nb-vista-cola-label">Pila (tope a la derecha)</span>
      {paso.pila.length ? paso.pila.map((c, k) => <span key={k} className="nb-vista-cola-item">{c}</span>) : <span className="nb-vista-cola-vacia">vacía</span>}
    </div>
  </div>
);
