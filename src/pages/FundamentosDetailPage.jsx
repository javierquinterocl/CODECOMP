import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ESPERA_ENVIO,
  PLANTILLA_PSEINT,
  buscarNivel,
  buscarTema,
  minutosTemporizador,
} from '../scripts/fundamentosData';
import { temporizadorActivo } from '../scripts/fundamentosProgreso';
import { abrirEjercicio, enviarSolucion, guardarBorrador } from '../scripts/fundamentosApi';
import { explicarError } from '../scripts/pseintErrores';
import { useFundamentos } from '../scripts/useFundamentos';
import { useAuth } from '../context/AuthContext';
import FundamentosCarga from '../components/FundamentosCarga';
import { NIVELES } from '../scripts/problemsData';
import { NivelBarra } from '../components/ProblemBits';
import { Editor, Plegable, Ejemplo } from '../components/ExerciseBits';
import { LockIcon, CollapseIcon, ExpandIcon, ClockIcon } from '../components/AppIcons';

// Mientras se teclea, el borrador va a la base como mucho una vez cada tanto (y al salir).
const ESPERA_BORRADOR = 15000;

const reloj = (segundos) => `${Math.floor(segundos / 60)}:${String(segundos % 60).padStart(2, '0')}`;

const ESPERAS = new Set(['limite-espera', 'limite-diario', 'candado']);

// Clase, título y textos de la caja del gato según lo que respondió el juez.
const describir = (r) => {
  if (r.falla) {
    const espera = ESPERAS.has(r.codigo);
    return { clase: espera ? '' : ' is-fail', titulo: espera ? 'Espera un momento' : 'No se pudo evaluar', texto: r.falla };
  }
  switch (r.veredicto) {
    case 'ACEPTADO':
      return {
        clase: ' is-ok',
        titulo: '¡Aceptado!',
        texto: `Tu algoritmo pasó ${r.ejemplos === 1 ? 'el ejemplo' : `los ${r.ejemplos} ejemplos`} del enunciado.`,
      };
    case 'INCORRECTO':
      return {
        clase: ' is-fail',
        titulo: 'Respuesta incorrecta',
        texto: `En el ejemplo ${r.ejemplo} tu salida no coincide con la esperada.`,
        comparar: true,
      };
    case 'ERROR':
      return { clase: ' is-fail', titulo: `Error en la línea ${r.linea}`, oficial: r.mensaje, texto: explicarError(r.numero) };
    case 'SIN_DATOS':
      return {
        clase: ' is-fail',
        titulo: `Error en la línea ${r.linea}`,
        texto: 'Leer pidió un dato más, pero la entrada del ejemplo ya se acabó. Revisa cuántos datos lees.',
      };
    case 'NO_TERMINA':
      return {
        clase: ' is-fail',
        titulo: 'Tu algoritmo no termina',
        texto: 'Se detuvo a los 3 segundos. Revisa que la condición de tus ciclos llegue a cumplirse.',
      };
    case 'DEMASIADA_SALIDA':
      return {
        clase: ' is-fail',
        titulo: 'Tu algoritmo escribió demasiado',
        texto: 'Revisa que ningún Escribir esté dentro de un ciclo que no termina.',
      };
    default:
      return {
        clase: ' is-fail',
        titulo: 'No se pudo evaluar',
        texto: 'El intérprete de PSeInt se detuvo de forma inesperada. Revisa tu código e inténtalo de nuevo.',
      };
  }
};

const Salida = ({ etiqueta, texto, vacio }) => (
  <div className="nb-ex-feedback-output">
    <span className="nb-ex-feedback-label">{etiqueta}</span>
    <pre>{texto || vacio}</pre>
  </div>
);

/* ── Panel del gato ──
   Un segundo sidebar, pegado al borde derecho. Parece un chat pero es de solo
   lectura: los mensajes vienen con el tema y aclaran el concepto, nunca el
   ejercicio. Se pliega igual que el menú: el contenido conserva su ancho y
   el panel lo recorta. */
const PanelGato = ({ tema, extra, oculto, onAlternar }) => {
  const mensajes = extra ? [...tema.conceptos, { texto: extra }] : tema.conceptos;
  const accion = oculto ? 'Mostrar los datos del tema' : 'Ocultar los datos del tema';

  return (
    <aside className={`nb-fd-lateral${oculto ? ' is-collapsed' : ''}`} aria-label={`Datos del tema ${tema.titulo}`}>
      <div className="nb-fd-lateral-head">
        <button
          type="button"
          className="nb-fd-lateral-toggle"
          onClick={onAlternar}
          aria-expanded={!oculto}
          title={accion}
          aria-label={accion}
        >
          {oculto ? <CollapseIcon /> : <ExpandIcon />}
        </button>
        <div className="nb-fd-lateral-quien">
          <span className="nb-fd-lateral-nombre">¡Datos que debes tener en cuenta!</span>
          <span className="nb-fd-lateral-tema">{tema.titulo}</span>
        </div>
      </div>

      {/* Con el panel plegado solo queda la cara del gato, que lo vuelve a abrir. */}
      <button
        type="button"
        className="nb-fd-lateral-cara"
        onClick={onAlternar}
        tabIndex={oculto ? 0 : -1}
        aria-hidden={!oculto}
        title={accion}
        aria-label={accion}
      >
        <span className="nb-fd-gato-avatar"><img src="/cat-pixel.png" alt="" width="512" height="512" /></span>
      </button>

      <div className="nb-fd-lateral-body" inert={oculto}>
        {mensajes.map((m) => (
          <div key={m.texto} className="nb-fd-msg">
            <span className="nb-fd-gato-avatar" aria-hidden="true"><img src="/cat-pixel.png" alt="" width="512" height="512" /></span>
            <div className="nb-fd-burbuja">
              <p>{m.texto}</p>
              {m.codigo && <pre>{m.codigo}</pre>}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
};

const Ejercicio = ({ nivel, ejercicio, total }) => {
  const { user, authReady } = useAuth();
  const tema = buscarTema(ejercicio.tema);
  const listado = `/dashboard/fundamentos/${nivel.slug}`;

  const [codigo, setCodigo] = useState(PLANTILLA_PSEINT);
  const [expandido, setExpandido] = useState(false);
  // PSeInt es claro por defecto; aquí el editor arranca igual.
  const [temaClaro, setTemaClaro] = useState(true);
  // Lo último que respondió el juez: solo un envío nuevo lo cambia.
  const [resultado, setResultado] = useState(null);
  const [evaluando, setEvaluando] = useState(false);
  // El panel arranca plegado: el estudiante lo abre cuando quiere repasar el tema.
  const [gatoOculto, setGatoOculto] = useState(true);
  // Mientras la base no diga cuándo se abrió por primera vez, el candado cuenta desde ahora.
  const [desbloqueoEn, setDesbloqueoEn] = useState(() => Date.now() + ESPERA_ENVIO * 1000);
  const [ahora, setAhora] = useState(() => Date.now());

  // Temporizador de práctica: se enciende desde la tarjeta del nivel y corre
  // desde que se abre el ejercicio. Al acabarse solo avisa; no bloquea nada.
  const [conReloj] = useState(temporizadorActivo);
  const [finRelojEn] = useState(() => Date.now() + minutosTemporizador(ejercicio.nivel) * 60 * 1000);

  const restante = Math.max(0, Math.ceil((desbloqueoEn - ahora) / 1000));
  const bloqueado = restante > 0;
  const quedan = Math.max(0, Math.ceil((finRelojEn - ahora) / 1000));
  const tiempoAgotado = conReloj && quedan === 0;
  const corriendo = bloqueado || (conReloj && !tiempoAgotado);

  // Borrador por guardar, y si el estudiante ya tecleó (para no pisarle lo escrito).
  const pendiente = useRef(null);
  const espera = useRef(null);
  const guardado = useRef(null);
  const tocado = useRef(false);
  const abierto = useRef(false);

  const guardarPendiente = useCallback((alSalir = false) => {
    clearTimeout(espera.current);
    espera.current = null;
    if (pendiente.current === null || !abierto.current || !user) return;
    const texto = pendiente.current;
    pendiente.current = null;
    // Lo que ya está en la base no se vuelve a mandar.
    if (texto === guardado.current) return;
    guardado.current = texto;
    // Si no se guarda, el estudiante sigue trabajando: no es motivo para interrumpirlo.
    guardarBorrador(user, nivel.slug, ejercicio.numero, texto, { alSalir }).catch(() => {
      guardado.current = null;
    });
  }, [user, nivel.slug, ejercicio.numero]);

  const escribir = (texto) => {
    tocado.current = true;
    setCodigo(texto);
    pendiente.current = texto;
    // El reloj no se reinicia con cada tecla: así el ritmo de escrituras tiene tope.
    espera.current ??= setTimeout(guardarPendiente, ESPERA_BORRADOR);
  };

  // Registra la apertura: fija el candado con la hora de la base y trae el borrador.
  useEffect(() => {
    if (!authReady || !user) return undefined;
    let vigente = true;
    abrirEjercicio(user, nivel.slug, ejercicio.numero)
      .then(({ transcurrido, codigo: enBase }) => {
        if (!vigente) return;
        abierto.current = true;
        setDesbloqueoEn(Date.now() + ESPERA_ENVIO * 1000 - transcurrido);
        guardado.current = enBase ?? PLANTILLA_PSEINT;
        if (typeof enBase === 'string' && !tocado.current) setCodigo(enBase);
      })
      .catch(() => {});
    return () => { vigente = false; };
  }, [authReady, user, nivel.slug, ejercicio.numero]);

  // Al salir del ejercicio o cerrar la pestaña se manda lo que quedara sin guardar.
  useEffect(() => {
    const alSalir = () => guardarPendiente(true);
    window.addEventListener('pagehide', alSalir);
    return () => {
      window.removeEventListener('pagehide', alSalir);
      alSalir();
    };
  }, [guardarPendiente]);

  useEffect(() => {
    if (!corriendo) return undefined;
    const tic = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(tic);
  }, [corriendo]);

  const reiniciar = () => escribir(PLANTILLA_PSEINT);

  const evaluar = async () => {
    if (!user || evaluando) return;
    setEvaluando(true);
    try {
      setResultado(await enviarSolucion(user, nivel.slug, ejercicio.numero, codigo));
    } catch (error) {
      setResultado({ falla: error.message, codigo: error.codigo });
    } finally {
      setEvaluando(false);
    }
  };

  const veredicto = resultado && describir(resultado);
  const lineaError = resultado?.veredicto === 'ERROR' || resultado?.veredicto === 'SIN_DATOS' ? resultado.linea : null;

  return (
    <div className="nb-fd-vista">
      <div className="nb-fd-vista-main">
      <Link to={listado} className="nb-pb-back">
        ← Volver a {nivel.titulo.toLowerCase()}
      </Link>

      <div className={`nb-ex nb-fd-ex${expandido ? ' is-expanded' : ''}`}>

        {/* ══ Columna izquierda: el enunciado ══ */}
        <div className="nb-ex-left">
          <div className="nb-ex-card nb-ex-title-card" style={{ '--cat-bg': nivel.color.bgSuave, '--cat-ink': nivel.color.inkSuave }}>
            <div className="nb-ex-title-main">
              <div className="nb-ex-kicker">{tema.titulo}</div>
              <h1 className="nb-ex-title">{ejercicio.titulo}</h1>
            </div>
            <div className="nb-ex-title-side">
              <span className="nb-ex-numero">{ejercicio.numero}</span>
            </div>
          </div>

          <div className="nb-ex-meta">
            <div className="nb-ex-meta-item">
              <span className="nb-ex-meta-label">Dificultad</span>
              <span className="nb-ex-meta-value">
                {NIVELES[ejercicio.nivel]} <NivelBarra nivel={ejercicio.nivel} />
              </span>
            </div>
            <div className="nb-ex-meta-item">
              <span className="nb-ex-meta-label">Tema</span>
              <span className="nb-ex-meta-value">{tema.titulo}</span>
            </div>
            <div className="nb-ex-meta-item">
              <span className="nb-ex-meta-label">Ejercicio</span>
              <span className="nb-ex-meta-value">{ejercicio.numero} de {total}</span>
            </div>
          </div>

          <Plegable titulo="Descripción" abiertoInicial>
            {ejercicio.descripcion.map((p) => (
              <p key={p} className="nb-ex-text">{p}</p>
            ))}
          </Plegable>

          <Plegable titulo="Entrada y salida">
            <h3 className="nb-ex-h3">Entrada</h3>
            <p className="nb-ex-text">{ejercicio.entrada}</p>
            <h3 className="nb-ex-h3" style={{ marginTop: 'var(--sp-gap)' }}>Salida</h3>
            <p className="nb-ex-text">{ejercicio.salida}</p>
          </Plegable>

          <Plegable titulo="Ejemplos">
            <div className="nb-ex-samples">
              {ejercicio.ejemplos.map((ej, i) => (
                <Ejemplo key={`${ej.entrada}|${ej.salida}`} n={i + 1} entrada={ej.entrada} salida={ej.salida} />
              ))}
            </div>
          </Plegable>
        </div>

        {/* ══ Columna derecha: el editor ══ */}
        <div className="nb-ex-right">
          <div className="nb-ex-toolbar">
            <div className="nb-fd-lenguaje">
              <span className="nb-select-label">Lenguaje</span>
              <span className="nb-fd-lenguaje-valor">PSeInt</span>
            </div>

            <button
              type="button"
              className={`nb-ex-send${bloqueado ? ' is-locked' : ''}${evaluando ? ' is-busy' : ''}`}
              onClick={evaluar}
              disabled={bloqueado || evaluando}
              title={bloqueado ? 'Lee el enunciado y piensa tu solución: el envío se abre en un momento' : undefined}
            >
              {bloqueado
                ? <><LockIcon /> Enviar en {reloj(restante)}</>
                : evaluando ? 'Evaluando…' : 'Enviar'}
            </button>
          </div>

          <Editor
            codigo={codigo}
            lenguajeId="pseint"
            onChange={escribir}
            expandido={expandido}
            onExpandir={() => setExpandido((v) => !v)}
            claro={temaClaro}
            onTema={() => setTemaClaro((v) => !v)}
            onReiniciar={reiniciar}
            bloquearPegado
            tabulador
            lineaError={lineaError}
            extra={conReloj && (
              <span
                className={`nb-fd-timer${tiempoAgotado ? ' is-done' : ''}`}
                role="timer"
                title={`Temporizador de práctica: ${minutosTemporizador(ejercicio.nivel)} minutos`}
              >
                <ClockIcon /> {reloj(quedan)}
              </span>
            )}
          />

          <div className={`nb-ex-feedback${veredicto ? veredicto.clase : ''}`}>
            <img className="nb-ex-cat" src="/cat-pixel.png" alt="" width="512" height="512" aria-hidden="true" />
            <div className="nb-ex-feedback-main" aria-live="polite">
              <div className="nb-ex-feedback-title">
                {veredicto
                  ? veredicto.titulo
                  : tiempoAgotado ? 'Se acabó el tiempo' : '¡Resuélvelo primero, vamos!'}
              </div>
              {veredicto ? (
                <div className="nb-ex-feedback-result">
                  {veredicto.oficial && <p className="nb-ex-feedback-text"><strong>{veredicto.oficial}</strong></p>}
                  <p className="nb-ex-feedback-text">{veredicto.texto}</p>
                  {veredicto.comparar && (
                    <>
                      <Salida etiqueta="Entrada" texto={resultado.entrada} vacio="(sin entrada)" />
                      <Salida etiqueta="Salida esperada" texto={resultado.esperada} vacio="(sin salida)" />
                      <Salida etiqueta="Tu salida" texto={resultado.obtenida} vacio="(sin salida)" />
                    </>
                  )}
                </div>
              ) : (
                <p className="nb-ex-feedback-text">
                  {tiempoAgotado
                    ? 'Tranquilo, esto es solo práctica: puedes seguir editando y enviar cuando quieras.'
                    : bloqueado
                    ? 'Tómate este tiempo para leer el enunciado y pensar los pasos. El envío se desbloquea cuando termine la cuenta.'
                    : 'Escribe tu solución y envíala. Aquí aparecerá el veredicto del juez.'}
                </p>
              )}
            </div>
          </div>
        </div>

      </div>
      </div>

      <PanelGato
        tema={tema}
        extra={ejercicio.pistaConcepto}
        oculto={gatoOculto}
        onAlternar={() => setGatoOculto((v) => !v)}
      />
    </div>
  );
};

const FundamentosDetailPage = () => {
  const { nivel: nivelSlug, numero } = useParams();
  const nivel = buscarNivel(nivelSlug);
  const { ejercicios, cargando, error } = useFundamentos();
  const volverA = nivel ? `/dashboard/fundamentos/${nivel.slug}` : '/dashboard/fundamentos';

  if (nivel && (cargando || error)) return <FundamentosCarga error={error} volverA={volverA} />;

  // Un ejercicio se identifica por su nivel y su número dentro de ese nivel.
  const delNivel = (nivel && ejercicios?.[nivel.slug]) || [];
  const ejercicio = delNivel.find((e) => String(e.numero) === String(numero));

  if (!ejercicio) {
    return (
      <div className="nb-dash-inner">
        <Link to={volverA} className="nb-pb-back">← Volver</Link>
        <div className="nb-pb-empty">
          <h3 className="nb-pb-empty-title">Ejercicio no encontrado</h3>
          <p className="nb-dash-body-text">No existe ese ejercicio en este nivel.</p>
        </div>
      </div>
    );
  }

  // La `key` reinicia el editor y la cuenta atrás al pasar de un ejercicio a otro.
  return <Ejercicio key={`${nivel.slug}:${ejercicio.numero}`} nivel={nivel} ejercicio={ejercicio} total={delNivel.length} />;
};

export default FundamentosDetailPage;
