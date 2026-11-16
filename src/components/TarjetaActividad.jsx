import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import MapaActividad from './MapaActividad';
import { EsqFilas } from './Esqueleto';
import { duracion, fechaLarga, veredictoEs } from '../scripts/docenteData';
import { buscarCategoria, categoriaDeProblema } from '../scripts/problemsData';
import { buscarNivel } from '../scripts/fundamentosData';

// Textos borrador: los decide el equipo.
const VEREDICTOS_FUNDAMENTOS = {
  ACEPTADO: 'Aceptado', INCORRECTO: 'Respuesta incorrecta', ERROR: 'Error', NO_TERMINA: 'No termina', SIN_DATOS: 'Sin datos',
};

const Ejercicio = ({ e, conTiempo }) => {
  const fundamentos = e.tipo === 'fundamentos';
  const enlace = fundamentos ? `/dashboard/fundamentos/${e.nivel}/${e.numero}` : `/dashboard/problemas/todos/${e.numero}`;
  const origen = fundamentos
    ? `${buscarNivel(e.nivel)?.titulo || 'Fundamentos'} · ejercicio ${e.numero}`
    : `Problema #${e.numero} · ${buscarCategoria(categoriaDeProblema({ tags: e.tags, dificultadRating: e.dificultad }))?.titulo || 'Problemas'}`;
  const veredicto = e.aceptado
    ? 'Aceptado'
    : e.ultimoVeredicto
      ? (fundamentos ? VEREDICTOS_FUNDAMENTOS[e.ultimoVeredicto] || e.ultimoVeredicto : veredictoEs(e.ultimoVeredicto))
      : 'Sin envíos';
  return (
    <li className="nb-doc-fila nb-doc-dia-fila">
      <span className="nb-doc-celda is-grande">
        <Link className="nb-doc-dia-titulo" to={enlace}>{e.titulo}</Link>
        <small>{origen}</small>
      </span>
      {conTiempo && <span className="nb-doc-dato"><small>Tiempo</small><strong>{duracion(e.segundos)}</strong></span>}
      <span className="nb-doc-dato"><small>Envíos</small><strong>{e.envios}</strong></span>
      <span className={`nb-doc-estado nb-doc-dia-estado${e.aceptado ? ' is-on' : ''}`}>{veredicto}</span>
    </li>
  );
};

/** Panel del día elegido: resumen fijo arriba y la lista de ejercicios, que se desplaza por dentro. */
const DetalleDia = ({ dia, resultado, conTiempo, anterior, siguiente, onIr, onReintentar }) => {
  if (!dia) {
    return (
      <div className="nb-doc-dia-vacio">
        <p className="nb-doc-dia-fecha">Aún no hay actividad</p>
        <p className="nb-doc-nota">Cuando practiques, aquí verás qué hiciste cada día.</p>
        <div className="nb-doc-dia-enlaces">
          <Link className="nb-doc-filtro" to="/dashboard/fundamentos">Ir a Fundamentos</Link>
          <Link className="nb-doc-filtro" to="/dashboard/problemas">Ir a Problemas</Link>
        </div>
      </div>
    );
  }
  const datos = resultado?.datos;
  return (
    <>
      <div className="nb-doc-dia-cabeza">
        <div className="nb-doc-dia-nav">
          <button type="button" className="nb-doc-dia-flecha" disabled={!anterior} onClick={() => onIr(anterior)}
            aria-label="Día anterior con actividad" title="Día anterior con actividad">‹</button>
          <p className="nb-doc-dia-fecha">{fechaLarga(dia)}</p>
          <button type="button" className="nb-doc-dia-flecha" disabled={!siguiente} onClick={() => onIr(siguiente)}
            aria-label="Día siguiente con actividad" title="Día siguiente con actividad">›</button>
        </div>
        <div className="nb-doc-dia-cifras" aria-live="polite">
          {datos && (
            <>
              {conTiempo && <span className="nb-dash-chip">{duracion(datos.segundos)} en la plataforma</span>}
              {conTiempo && <span className="nb-dash-chip">{duracion(datos.segundosEjercicios)} en ejercicios</span>}
              <span className="nb-dash-chip">{datos.envios} {datos.envios === 1 ? 'envío' : 'envíos'}</span>
              <span className="nb-dash-chip">{datos.aceptados} {datos.aceptados === 1 ? 'aceptado' : 'aceptados'}</span>
            </>
          )}
        </div>
      </div>
      <div className="nb-doc-dia-lista">
        {resultado?.error ? (
          <div className="nb-doc-dia-vacio">
            <p className="nb-doc-nota">{resultado.error}</p>
            <button type="button" className="nb-doc-filtro" onClick={onReintentar}>Reintentar</button>
          </div>
        ) : !datos ? (
          <EsqFilas n={3} aviso="Cargando el día…" />
        ) : datos.ejercicios.length ? (
          <ul className="nb-doc-tabla">
            {datos.ejercicios.map((e) => <Ejercicio key={`${e.tipo}-${e.nivel}-${e.numero}`} e={e} conTiempo={conTiempo} />)}
          </ul>
        ) : (
          <p className="nb-doc-vacio">{datos.segundos > 0 ? 'Este día entraste, pero no trabajaste en ejercicios.' : 'Este día no practicaste.'}</p>
        )}
      </div>
    </>
  );
};

/**
 * Tarjeta «Tu actividad»: el mapa de 12 meses y, al lado (o debajo si no cabe), el detalle del
 * día elegido. Arranca en el último día con actividad. `cargarDia(fecha)` pide el detalle.
 */
const TarjetaActividad = ({ titulo, sub, nota, mapa, conTiempo, cargarDia }) => {
  const dias = useMemo(() => mapa.semanas.flat().filter(Boolean), [mapa]);
  const activos = useMemo(() => dias.filter((c) => c.segundos > 0 || c.envios > 0).map((c) => c.dia), [dias]);
  const hoy = dias.at(-1)?.dia;
  const [elegido, setElegido] = useState(null);
  const dia = elegido ?? activos.at(-1) ?? null;
  const [resultados, setResultados] = useState({});
  const [intento, setIntento] = useState(0);
  // Días ya traídos; hoy no se guarda porque sigue cambiando.
  const listos = useRef(new Set());
  // La función puede cambiar en cada render de la página: se lee de una referencia.
  const cargarRef = useRef(cargarDia);
  useEffect(() => { cargarRef.current = cargarDia; }, [cargarDia]);

  useEffect(() => {
    if (!dia || listos.current.has(dia)) return undefined;
    let vigente = true;
    cargarRef.current(dia)
      .then((datos) => {
        if (dia !== hoy) listos.current.add(dia);
        if (vigente) setResultados((r) => ({ ...r, [dia]: { datos } }));
      })
      .catch((e) => { if (vigente) setResultados((r) => ({ ...r, [dia]: { error: e.message || 'No se pudo cargar ese día.' } })); });
    return () => { vigente = false; };
  }, [dia, hoy, mapa, intento]);

  const anterior = dia ? activos.filter((d) => d < dia).at(-1) : null;
  const siguiente = dia ? activos.find((d) => d > dia) : null;
  const reintentar = () => {
    setResultados((r) => { const n = { ...r }; delete n[dia]; return n; });
    setIntento((i) => i + 1);
  };

  return (
    <section className="nb-dash-card nb-dash-pad nb-doc-actividad">
      <div className="nb-doc-actividad-grid">
        <div className="nb-doc-actividad-mapa">
          <h2 className="nb-dash-section-title">{titulo}</h2>
          <div className="nb-dash-section-sub">{sub}</div>
          {nota}
          <MapaActividad mapa={mapa} conTiempo={conTiempo} seleccionado={dia} onSeleccionar={setElegido} />
        </div>
        <div className="nb-doc-dia" role="region" aria-label="Detalle del día">
          <div className="nb-doc-dia-interior">
            <DetalleDia
              dia={dia}
              resultado={dia ? resultados[dia] : null}
              conTiempo={conTiempo}
              anterior={anterior}
              siguiente={siguiente}
              onIr={setElegido}
              onReintentar={reintentar}
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default TarjetaActividad;
