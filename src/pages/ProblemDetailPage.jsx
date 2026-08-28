import { useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { LENGUAJES, NIVELES, buscarCategoria, buscarEjercicio } from '../scripts/problemsData';
import { useFavoritos } from '../scripts/useFavoritos';
import { StarIcon, NivelBarra } from '../components/ProblemBits';
import NbSelect from '../components/NbSelect';

const MIN_LINEAS = 18;

/* ── Editor: textarea con una regleta de números a la izquierda ──
   No es un editor de verdad (sin resaltado ni autocompletado), pero
   sí crece, se numera y se puede agrandar, que es lo que pide el diseño. */
const Editor = ({ codigo, onChange, expandido, onExpandir, claro, onTema }) => {
  const regletaRef = useRef(null);

  const lineas = useMemo(() => {
    const total = Math.max(codigo.split('\n').length, MIN_LINEAS);
    return Array.from({ length: total }, (_, i) => i + 1);
  }, [codigo]);

  // La regleta no tiene barra propia: sigue el desplazamiento del textarea.
  const sincronizarScroll = (e) => {
    if (regletaRef.current) regletaRef.current.scrollTop = e.target.scrollTop;
  };

  return (
    <div className={`nb-ex-editor${expandido ? ' is-expanded' : ''}${claro ? ' is-light' : ''}`}>
      <div className="nb-ex-editor-head">
        <span className="nb-ex-editor-label">Código fuente</span>
        <div className="nb-ex-editor-tools">
          <button
            type="button"
            className="nb-ex-icon-btn"
            onClick={onTema}
            aria-pressed={claro}
            title={claro ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'}
          >
            {claro ? '🌙' : '☀'}
          </button>
          <button
            type="button"
            className="nb-ex-icon-btn"
            onClick={onExpandir}
            aria-pressed={expandido}
            title={expandido ? 'Reducir el editor' : 'Agrandar el editor'}
          >
            {expandido ? '⤡ Reducir' : '⤢ Agrandar'}
          </button>
        </div>
      </div>

      <div className="nb-ex-editor-body">
        <div className="nb-ex-gutter" ref={regletaRef} aria-hidden="true">
          {lineas.map((n) => <span key={n}>{n}</span>)}
        </div>
        <textarea
          className="nb-ex-code"
          value={codigo}
          onChange={(e) => onChange(e.target.value)}
          onScroll={sincronizarScroll}
          spellCheck="false"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          aria-label="Editor de código"
        />
      </div>
    </div>
  );
};

/* ── Bloque de ejemplo: entrada y salida lado a lado ── */
const Ejemplo = ({ n, entrada, salida }) => (
  <div className="nb-ex-sample">
    <div className="nb-ex-sample-col">
      <div className="nb-ex-sample-label">Entrada {n}</div>
      <pre className="nb-ex-pre">{entrada || '(sin entrada)'}</pre>
    </div>
    <div className="nb-ex-sample-col">
      <div className="nb-ex-sample-label">Salida {n}</div>
      <pre className="nb-ex-pre">{salida}</pre>
    </div>
  </div>
);

const ProblemDetailPage = () => {
  const { slug, numero } = useParams();
  const { esFavorito, alternar } = useFavoritos();

  const ejercicio = buscarEjercicio(numero);
  const [lenguaje, setLenguaje] = useState(LENGUAJES[0]);
  const [codigo, setCodigo] = useState(LENGUAJES[0].plantilla);
  const [expandido, setExpandido] = useState(false);
  const [temaClaro, setTemaClaro] = useState(false);
  const [enviado, setEnviado] = useState(false);

  if (!ejercicio) {
    return (
      <div className="nb-dash-inner">
        <Link to={`/dashboard/problemas/${slug || 'principiante'}`} className="nb-pb-back">← Volver al listado</Link>
        <div className="nb-pb-empty">
          <h3 className="nb-pb-empty-title">Ejercicio no encontrado</h3>
          <p className="nb-dash-body-text">No existe un ejercicio con el número «{numero}».</p>
        </div>
      </div>
    );
  }

  const categoria = buscarCategoria(ejercicio.categoria);
  // El destino de "volver" es el listado por el que se entró, que puede ser "todos".
  const volverA = slug === 'todos' ? 'todos los problemas' : (categoria?.titulo || 'problemas');
  const marcado = esFavorito(ejercicio.numero);

  /* Al cambiar de lenguaje solo se reemplaza la plantilla si nadie la tocó:
     así no se pierde el trabajo de quien ya empezó a escribir. */
  const cambiarLenguaje = (id) => {
    const siguiente = LENGUAJES.find((l) => l.id === id);
    if (!siguiente) return;
    if (codigo.trim() === lenguaje.plantilla.trim()) setCodigo(siguiente.plantilla);
    setLenguaje(siguiente);
  };

  const reiniciar = () => {
    setCodigo(lenguaje.plantilla);
    setEnviado(false);
  };

  return (
    <div className="nb-dash-inner">
      <Link to={`/dashboard/problemas/${slug}`} className="nb-pb-back">
        ← Volver a {volverA}
      </Link>

      <div className={`nb-ex${expandido ? ' is-expanded' : ''}`}>

        {/* ══ Columna izquierda: el enunciado ══ */}
        <div className="nb-ex-left">

          {/* Nombre del ejercicio + número */}
          <div
            className="nb-ex-card nb-ex-title-card"
            style={{ '--cat-bg': categoria?.bg || 'var(--nb-blue)', '--cat-ink': categoria?.ink || '#fff' }}
          >
            <div className="nb-ex-title-main">
              <div className="nb-ex-kicker">{categoria?.titulo || 'Problema'}</div>
              <h1 className="nb-ex-title">{ejercicio.titulo}</h1>
            </div>

            <div className="nb-ex-title-side">
              <span className="nb-ex-numero">{ejercicio.numero}</span>
              <button
                type="button"
                className={`nb-pb-fav is-onhead${marcado ? ' is-on' : ''}`}
                onClick={() => alternar(ejercicio.numero)}
                aria-pressed={marcado}
                title={marcado ? 'Quitar de favoritos' : 'Marcar como favorito'}
              >
                <StarIcon relleno={marcado} />
              </button>
            </div>
          </div>

          {/* Franja de datos rápidos */}
          <div className="nb-ex-meta">
            <div className="nb-ex-meta-item">
              <span className="nb-ex-meta-label">Complejidad</span>
              <span className="nb-ex-meta-value">
                {NIVELES[ejercicio.nivel]} <NivelBarra nivel={ejercicio.nivel} />
              </span>
            </div>
            <div className="nb-ex-meta-item">
              <span className="nb-ex-meta-label">Puntos</span>
              <span className="nb-ex-meta-value">+{ejercicio.puntos.toFixed(1)}</span>
            </div>
            <div className="nb-ex-meta-item">
              <span className="nb-ex-meta-label">Tiempo</span>
              <span className="nb-ex-meta-value">{ejercicio.tiempoLimite} s</span>
            </div>
            <div className="nb-ex-meta-item">
              <span className="nb-ex-meta-label">Memoria</span>
              <span className="nb-ex-meta-value">{ejercicio.memoriaLimite} MB</span>
            </div>
          </div>

          {/* Descripción */}
          <div className="nb-ex-card nb-ex-pad">
            <h2 className="nb-ex-h2">Descripción</h2>
            {ejercicio.descripcion.map((p) => (
              <p key={p} className="nb-ex-text">{p}</p>
            ))}
          </div>

          {/* Entrada y salida */}
          <div className="nb-ex-card nb-ex-pad">
            <h2 className="nb-ex-h2">Entrada</h2>
            <p className="nb-ex-text">{ejercicio.entrada}</p>
            <h2 className="nb-ex-h2" style={{ marginTop: 'var(--sp-gap)' }}>Salida</h2>
            <p className="nb-ex-text">{ejercicio.salida}</p>
          </div>

          {/* Ejemplos */}
          <div className="nb-ex-card nb-ex-pad">
            <h2 className="nb-ex-h2">Ejemplos</h2>
            <div className="nb-ex-samples">
              {ejercicio.ejemplos.map((ej, i) => (
                <Ejemplo key={ej.salida} n={i + 1} entrada={ej.entrada} salida={ej.salida} />
              ))}
            </div>
          </div>
        </div>

        {/* ══ Columna derecha: el editor ══ */}
        <div className="nb-ex-right">

          <div className="nb-ex-toolbar">
            <NbSelect
              label="Lenguaje"
              value={lenguaje.id}
              onChange={cambiarLenguaje}
              options={LENGUAJES.map((l) => ({ value: l.id, label: l.nombre }))}
            />

            <button type="button" className="nb-ex-reset" onClick={reiniciar}>
              Reiniciar
            </button>
            <button type="button" className="nb-ex-send" onClick={() => setEnviado(true)}>
              Enviar
            </button>
          </div>

          <Editor
            codigo={codigo}
            onChange={(v) => { setCodigo(v); setEnviado(false); }}
            expandido={expandido}
            onExpandir={() => setExpandido((v) => !v)}
            claro={temaClaro}
            onTema={() => setTemaClaro((v) => !v)}
          />

          {/* Espacio reservado para la retroalimentación de la IA. */}
          <div className="nb-ex-feedback">
            <img className="nb-ex-cat" src="/cat-pixel.png" alt="" aria-hidden="true" />
            <div className="nb-ex-feedback-main">
              <div className="nb-ex-feedback-title">
                {enviado ? 'Envío recibido' : '¡Resuélvelo primero, vamos!'}
              </div>
              <p className="nb-ex-feedback-text">
                {enviado
                  ? 'Todavía no hay juez ni IA conectados, así que aún no hay veredicto. Este panel mostrará la retroalimentación cuando se conecte.'
                  : 'Escribe tu solución y envíala. Aquí aparecerá la retroalimentación de la IA sobre tu código.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProblemDetailPage;
