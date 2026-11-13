import { useEffect, useRef } from 'react';
import { duracion } from '../scripts/docenteData';

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const DIAS = ['', 'lun', '', 'mié', '', 'vie', ''];

const fechaLarga = (dia) => new Date(`${dia}T12:00:00Z`).toLocaleDateString('es-CO', {
  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
});

const detalleDe = (c, conTiempo) => [
  fechaLarga(c.dia),
  conTiempo ? `${duracion(c.segundos)} en la plataforma` : null,
  conTiempo ? `${duracion(c.segundosEjercicios)} en ejercicios` : null,
  `${c.envios} ${c.envios === 1 ? 'envío' : 'envíos'}`,
].filter(Boolean).join(' · ');

/**
 * Actividad de 12 meses estilo GitHub: una columna por semana, un cuadro por día, más oscuro
 * con más actividad. `mapa` viene del backend (semanasDeActividad). En móvil se desplaza y
 * arranca mostrando la semana actual.
 */
const MapaActividad = ({ mapa, conTiempo = true }) => {
  const cajaRef = useRef(null);
  useEffect(() => {
    if (cajaRef.current) cajaRef.current.scrollLeft = cajaRef.current.scrollWidth;
  }, [mapa]);

  const { totales } = mapa;
  const resumen = `${totales.diasActivos} días con actividad en los últimos 12 meses`
    + (conTiempo ? `, ${duracion(totales.segundos)} en la plataforma y ${duracion(totales.segundosEjercicios)} en ejercicios` : '')
    + `, ${totales.envios} envíos`;

  return (
    <div className="nb-doc-calor">
      <div className="nb-doc-calor-scroll" ref={cajaRef}>
        <div className="nb-doc-calor-grid" role="img" aria-label={resumen}>
          <div className="nb-doc-calor-meses" aria-hidden="true">
            {mapa.meses.map((m) => (
              <span key={`${m.columna}-${m.mes}`} style={{ gridColumnStart: m.columna + 1 }}>{MESES[m.mes]}</span>
            ))}
          </div>
          <div className="nb-doc-calor-dias" aria-hidden="true">
            {DIAS.map((d, i) => <span key={i}>{d}</span>)}
          </div>
          <div className="nb-doc-calor-celdas" aria-hidden="true">
            {mapa.semanas.flatMap((semana, s) => semana.map((c, d) => (c
              ? <span key={`${s}-${d}`} className={`nb-doc-calor-celda is-${c.nivel}`} title={detalleDe(c, conTiempo)} />
              : <span key={`${s}-${d}`} className="nb-doc-calor-celda is-futuro" />)))}
          </div>
        </div>
      </div>
      <div className="nb-doc-calor-pie">
        <span className="nb-comp-sub">{resumen}.</span>
        <span className="nb-doc-calor-leyenda" aria-hidden="true">
          Menos
          {[0, 1, 2, 3].map((n) => <span key={n} className={`nb-doc-calor-celda is-${n}`} />)}
          Más
        </span>
      </div>
    </div>
  );
};

export default MapaActividad;
