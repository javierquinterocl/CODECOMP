import { useEffect, useMemo, useRef, useState } from 'react';
import { duracion, fechaLarga } from '../scripts/docenteData';

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const DIAS = ['', 'lun', '', 'mié', '', 'vie', ''];
// Flechas: una columna es una semana (7 días) y una fila es un día.
const PASOS = { ArrowLeft: -7, ArrowRight: 7, ArrowUp: -1, ArrowDown: 1 };

const detalleDe = (c, conTiempo) => [
  fechaLarga(c.dia),
  conTiempo ? `${duracion(c.segundos)} en la plataforma` : null,
  conTiempo ? `${duracion(c.segundosEjercicios)} en ejercicios` : null,
  `${c.envios} ${c.envios === 1 ? 'envío' : 'envíos'}`,
].filter(Boolean).join(' · ');

/**
 * Actividad de 12 meses estilo GitHub: una columna por semana, un cuadro por día, más oscuro
 * con más actividad. `mapa` viene del backend (semanasDeActividad). Con `onSeleccionar`, cada
 * día es un botón: clic, Enter o Espacio lo eligen; las flechas solo mueven el foco.
 */
const MapaActividad = ({ mapa, conTiempo = true, seleccionado = null, onSeleccionar }) => {
  const cajaRef = useRef(null);
  const celdasRef = useRef(null);
  const [foco, setFoco] = useState(null);
  const interactivo = Boolean(onSeleccionar);
  const dias = useMemo(() => mapa.semanas.flat(), [mapa]);
  const ultimo = useMemo(() => dias.filter(Boolean).at(-1)?.dia, [dias]);
  // Solo un día entra al orden de Tab: el que tiene el foco, el elegido o hoy.
  const conTab = foco ?? seleccionado ?? ultimo;

  useEffect(() => {
    if (cajaRef.current) cajaRef.current.scrollLeft = cajaRef.current.scrollWidth;
  }, [mapa]);

  const mover = (e, indice) => {
    const paso = PASOS[e.key];
    if (!paso) return;
    e.preventDefault();
    let i = indice + paso;
    while (i >= 0 && i < dias.length && !dias[i]) i += paso; // salta los días futuros
    if (!dias[i]) return;
    const boton = celdasRef.current?.querySelector(`[data-dia="${dias[i].dia}"]`);
    setFoco(dias[i].dia);
    boton?.focus();
    boton?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  };

  const { totales } = mapa;
  const resumen = `${totales.diasActivos} ${totales.diasActivos === 1 ? 'día' : 'días'} con actividad en los últimos 12 meses`
    + (conTiempo ? `, ${duracion(totales.segundos)} en la plataforma y ${duracion(totales.segundosEjercicios)} en ejercicios` : '')
    + `, ${totales.envios} ${totales.envios === 1 ? 'envío' : 'envíos'}`;

  const celda = (c, indice) => {
    if (!c) return <span key={indice} className="nb-doc-calor-celda is-futuro" />;
    const clase = `nb-doc-calor-celda is-${c.nivel}${c.dia === seleccionado ? ' is-elegido' : ''}`;
    if (!interactivo) return <span key={indice} className={clase} title={detalleDe(c, conTiempo)} />;
    return (
      <button
        key={indice}
        type="button"
        data-dia={c.dia}
        className={clase}
        title={detalleDe(c, conTiempo)}
        aria-label={detalleDe(c, conTiempo)}
        aria-pressed={c.dia === seleccionado}
        tabIndex={c.dia === conTab ? 0 : -1}
        onClick={() => { setFoco(c.dia); onSeleccionar(c.dia); }}
        onKeyDown={(e) => mover(e, indice)}
        onFocus={() => setFoco(c.dia)}
      />
    );
  };

  return (
    <div className="nb-doc-calor">
      <div className="nb-doc-calor-scroll" ref={cajaRef}>
        <div className="nb-doc-calor-grid" role={interactivo ? undefined : 'img'} aria-label={interactivo ? undefined : resumen}>
          <div className="nb-doc-calor-meses" aria-hidden="true">
            {mapa.meses.map((m) => (
              <span key={`${m.columna}-${m.mes}`} style={{ gridColumnStart: m.columna + 1 }}>{MESES[m.mes]}</span>
            ))}
          </div>
          <div className="nb-doc-calor-dias" aria-hidden="true">
            {DIAS.map((d, i) => <span key={i}>{d}</span>)}
          </div>
          <div
            className="nb-doc-calor-celdas"
            ref={celdasRef}
            role={interactivo ? 'group' : undefined}
            aria-label={interactivo ? 'Días de los últimos 12 meses. Usa las flechas para moverte y Enter para ver el detalle.' : undefined}
            aria-hidden={interactivo ? undefined : 'true'}
          >
            {dias.map(celda)}
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
