const ANCHO = 600;
const ALTO = 160;

/** Línea del nivel después de cada problema cerrado, empezando en 1000. */
const NivelEvolucion = ({ puntos }) => {
  const valores = [1000, ...puntos.map((p) => Number(p.nivel_despues))];
  const min = Math.min(...valores) - 20;
  const max = Math.max(...valores) + 20;
  const x = (i) => (valores.length === 1 ? ANCHO / 2 : (i / (valores.length - 1)) * ANCHO);
  const y = (v) => ALTO - ((v - min) / (max - min)) * ALTO;
  return (
    <svg className="nb-doc-linea" viewBox={`0 0 ${ANCHO} ${ALTO}`} preserveAspectRatio="none" role="img"
      aria-label={`Nivel de ${valores[0]} a ${Math.round(valores[valores.length - 1])}`}>
      <line x1="0" y1={y(1000)} x2={ANCHO} y2={y(1000)} className="nb-doc-linea-base" />
      <polyline points={valores.map((v, i) => `${x(i)},${y(v)}`).join(' ')} className="nb-doc-linea-trazo" />
      {valores.map((v, i) => <rect key={i} x={x(i) - 4} y={y(v) - 4} width="8" height="8" className="nb-doc-linea-punto" />)}
    </svg>
  );
};

export default NivelEvolucion;
