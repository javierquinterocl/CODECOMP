import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { LENGUAJES, NIVELES, buscarCategoria, buscarEjercicio } from '../scripts/problemsData';
import { useFavoritos } from '../scripts/useFavoritos';
import { evaluarCodigo, evaluarCodigoAdaptativo, JUDGE0_LANGUAGE_IDS } from '../scripts/judge0Service';
import { useAuth } from '../context/AuthContext';
import { StarIcon, NivelBarra } from '../components/ProblemBits';
import NbSelect from '../components/NbSelect';
import { getProblem } from '../scripts/problemsApi';

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
  const { user } = useAuth();

  const ejercicio = buscarEjercicio(numero);
  const [lenguaje, setLenguaje] = useState(LENGUAJES[0]);
  const [codigo, setCodigo] = useState(LENGUAJES[0].plantilla);
  const [expandido, setExpandido] = useState(false);
  const [temaClaro, setTemaClaro] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [evaluando, setEvaluando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [errorEnvio, setErrorEnvio] = useState('');
  const [problemaReal, setProblemaReal] = useState(null);
  const [errorCarga, setErrorCarga] = useState('');

  useEffect(() => {
    if (import.meta.env.VITE_ENABLE_ADAPTIVE !== 'true') return;
    getProblem(numero).then(setProblemaReal).catch((e) => setErrorCarga(e.message));
  }, [numero]);

  const problema = problemaReal || ejercicio;
  if (!problema) {
    return (
      <div className="nb-dash-inner">
        <Link to={`/dashboard/problemas/${slug || 'principiante'}`} className="nb-pb-back">← Volver al listado</Link>
        <div className="nb-pb-empty">
          <h3 className="nb-pb-empty-title">Ejercicio no encontrado</h3>
          <p className="nb-dash-body-text">{errorCarga || `No existe un ejercicio con el número «${numero}».`}</p>
        </div>
      </div>
    );
  }

  const categoria = buscarCategoria(problema.categoria);
  // El destino de "volver" es el listado por el que se entró, que puede ser "todos".
  const volverA = slug === 'todos' ? 'todos los problemas' : (categoria?.titulo || 'problemas');
  const marcado = esFavorito(problema.numero);

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
    setResultado(null);
    setErrorEnvio('');
  };

  const enviarCodigo = async () => {
    setEvaluando(true);
    setEnviado(false);
    setResultado(null);
    setErrorEnvio('');

    try {
      const lenguajeId = JUDGE0_LANGUAGE_IDS[lenguaje.id];
      const resultadoJudge0 = import.meta.env.VITE_ENABLE_ADAPTIVE === 'true'
        ? await evaluarCodigoAdaptativo(codigo, lenguajeId, problema.numero, user)
        : await evaluarCodigo(codigo, lenguajeId, problema.ejemplos[0]?.entrada, problema.ejemplos[0]?.salida);
      setResultado(resultadoJudge0);
      setEnviado(true);
    } catch (error) {
      setErrorEnvio(error.message || 'No se pudo evaluar el código.');
    } finally {
      setEvaluando(false);
    }
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
              <h1 className="nb-ex-title">{problema.titulo}</h1>
            </div>

            <div className="nb-ex-title-side">
              <span className="nb-ex-numero">{problema.numero}</span>
              <button
                type="button"
                className={`nb-pb-fav is-onhead${marcado ? ' is-on' : ''}`}
                onClick={() => alternar(problema.numero)}
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
                <span className="nb-ex-meta-label">Dificultad</span>
              <span className="nb-ex-meta-value">
                {NIVELES[problema.nivel]} <NivelBarra nivel={problema.nivel} />
              </span>
            </div>
            <div className="nb-ex-meta-item">
              <span className="nb-ex-meta-label">Rating de dificultad</span>
              <span className="nb-ex-meta-value">+{problema.dificultadRating}</span>
            </div>
            <div className="nb-ex-meta-item">
              <span className="nb-ex-meta-label">Tiempo</span>
              <span className="nb-ex-meta-value">{problema.tiempoLimite} s</span>
            </div>
            <div className="nb-ex-meta-item">
              <span className="nb-ex-meta-label">Memoria</span>
              <span className="nb-ex-meta-value">{problema.memoriaLimite} MB</span>
            </div>
          </div>

          {/* Descripción */}
          <div className="nb-ex-card nb-ex-pad">
            <h2 className="nb-ex-h2">Descripción</h2>
            {problema.descripcion.map((p) => (
              <p key={p} className="nb-ex-text">{p}</p>
            ))}
          </div>

          {/* Entrada y salida */}
          <div className="nb-ex-card nb-ex-pad">
            <h2 className="nb-ex-h2">Entrada</h2>
            <p className="nb-ex-text">{problema.entrada}</p>
            <h2 className="nb-ex-h2" style={{ marginTop: 'var(--sp-gap)' }}>Salida</h2>
            <p className="nb-ex-text">{problema.salida}</p>
          </div>

          {/* Ejemplos */}
          <div className="nb-ex-card nb-ex-pad">
            <h2 className="nb-ex-h2">Ejemplos</h2>
            <div className="nb-ex-samples">
              {problema.ejemplos.map((ej, i) => (
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
            <button type="button" className="nb-ex-send" onClick={enviarCodigo} disabled={evaluando}>
              {evaluando ? 'Evaluando...' : 'Enviar'}
            </button>
          </div>

          <Editor
            codigo={codigo}
            onChange={(v) => {
              setCodigo(v);
              setEnviado(false);
              setResultado(null);
              setErrorEnvio('');
            }}
            expandido={expandido}
            onExpandir={() => setExpandido((v) => !v)}
            claro={temaClaro}
            onTema={() => setTemaClaro((v) => !v)}
          />

          {/* Espacio reservado para la retroalimentación de la IA. */}
          <div className="nb-ex-feedback">
            <img className="nb-ex-cat" src="/cat-pixel.png" alt="" aria-hidden="true" />
            <div className="nb-ex-feedback-main">
              <div className={`nb-ex-feedback-title${errorEnvio ? ' is-error' : enviado && resultado?.verdict === 'ACCEPTED' ? ' is-success' : ''}`}>
                {errorEnvio ? 'No se pudo evaluar' : enviado ? resultado?.verdict : '¡Resuélvelo primero, vamos!'}
              </div>
              {errorEnvio && <p className="nb-ex-feedback-text nb-ex-feedback-error">{errorEnvio}</p>}
              {!errorEnvio && !enviado && <p className="nb-ex-feedback-text">Escribe tu solución y envíala. Aquí aparecerá el veredicto del juez.</p>}
              {!errorEnvio && enviado && (
                <div className="nb-ex-feedback-result">
                  <div className="nb-ex-feedback-status">
                    <span>Estado</span>
                    <strong>{resultado.status?.description || resultado.statusDescription || resultado.verdict}</strong>
                  </div>
                  <div className="nb-ex-feedback-metrics">
                    <span>Tiempo: <strong>{resultado.time || '(no disponible)'}</strong></span>
                    <span>Memoria: <strong>{resultado.memory || '(no disponible)'}</strong></span>
                  </div>
                  {resultado.stdout !== undefined && (
                    <div className="nb-ex-feedback-output">
                      <span className="nb-ex-feedback-label">Salida</span>
                      <pre>{resultado.stdout || '(sin salida)'}</pre>
                    </div>
                  )}
                  {resultado.errorDetails && <p className="nb-ex-feedback-text nb-ex-feedback-error">{resultado.errorDetails}</p>}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProblemDetailPage;
