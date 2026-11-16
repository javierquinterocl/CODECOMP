import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { LENGUAJES, NIVELES, buscarCategoria, buscarEjercicio, categoriaDeProblema } from '../scripts/problemsData';
import { useFavoritos } from '../scripts/useFavoritos';
import { evaluarCodigo, evaluarCodigoAdaptativo, JUDGE0_LANGUAGE_IDS, VEREDICTOS_ES } from '../scripts/judge0Service';
import { useAuth } from '../context/AuthContext';
import { StarIcon, NivelBarra, IdiomaSwitch, Enunciado } from '../components/ProblemBits';
import { useIdioma } from '../scripts/useIdioma';
import { useTemaEditor } from '../scripts/useTemaEditor';
import NbSelect from '../components/NbSelect';
import { Editor, Plegable, Ejemplo } from '../components/ExerciseBits';
import { getProblem } from '../scripts/problemsApi';
import { pedirIdeaClave, pedirPista } from '../scripts/tutorApi';
import { registrarApertura } from '../scripts/registroApi';
import useEscalon, { olvidarEscalon } from '../scripts/useEscalon';
import { useBloqueoGuiado } from '../scripts/useBloqueoGuiado';
import { primeraDiferencia, textoDeDiferencia } from '../scripts/diferencia';
import useConfirmar from '../scripts/useConfirmar';
import useReinicios from '../scripts/useReinicios';
import ConfirmarDialogo from '../components/ConfirmarDialogo';
import PanelGato from '../components/PanelGato';
import { useChatErrores } from '../scripts/useChatErrores';
import { explicarEnvio, mensajeDelJuez } from '../scripts/erroresJuez';
import { LECCIONES } from '../scripts/lecciones/contenido';

// Espera entre pistas. El backend la impone de verdad (database/009); aqui
// solo se muestra la cuenta atras para no dejar el boton mintiendo.
const ESPERA_PISTA = 60;

const Detalle = () => {
  const { slug, numero } = useParams();
  const { esFavorito, alternar } = useFavoritos();
  const { user } = useAuth();
  const escalon = useEscalon(user);
  const { bloqueoDe } = useBloqueoGuiado(user);
  const { idioma: idiomaElegido, cambiar: cambiarIdioma } = useIdioma();

  const ejercicio = buscarEjercicio(numero);
  const [lenguaje, setLenguaje] = useState(LENGUAJES[0]);
  // Un borrador por lenguaje mientras dure la visita; sin borrador vale la plantilla.
  const [borradores, setBorradores] = useState({});
  const [expandido, setExpandido] = useState(false);
  const [temaClaro, setTemaClaro] = useTemaEditor('problemas');
  const [enviado, setEnviado] = useState(false);
  const [evaluando, setEvaluando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [errorEnvio, setErrorEnvio] = useState('');
  const [problemaReal, setProblemaReal] = useState(null);
  const [errorCarga, setErrorCarga] = useState('');
  // Pistas de este resultado (las quita un envío nuevo) y el nivel ya alcanzado en la visita:
  // tras otro envío, la siguiente pista sigue desde ahí.
  const [pistas, setPistas] = useState([]);
  const [nivelAlcanzado, setNivelAlcanzado] = useState(0);
  const [idea, setIdea] = useState({ texto: '', cargando: false, error: '' });
  const [pidiendoPista, setPidiendoPista] = useState(false);
  const [errorPista, setErrorPista] = useState('');
  const [pistaHasta, setPistaHasta] = useState(0);
  const [ahora, setAhora] = useState(() => Date.now());

  useEffect(() => {
    if (import.meta.env.VITE_ENABLE_ADAPTIVE !== 'true') return;
    getProblem(numero).then(setProblemaReal).catch((e) => setErrorCarga(e.message));
  }, [numero]);

  // Primera y última apertura, para medir cuánto tarda en resolverlo. Sin autorización no guarda nada.
  useEffect(() => {
    if (user && Number.isInteger(Number(numero))) registrarApertura(user, Number(numero));
  }, [user, numero]);

  useEffect(() => {
    if (!pistaHasta) return undefined;
    const tic = setInterval(() => {
      if (Date.now() >= pistaHasta) setPistaHasta(0);
      else setAhora(Date.now());
    }, 500);
    return () => clearInterval(tic);
  }, [pistaHasta]);

  const esperaPista = pistaHasta ? Math.max(0, Math.ceil((pistaHasta - ahora) / 1000)) : 0;

  const codigo = borradores[lenguaje.id] ?? lenguaje.plantilla;
  const { pedido, confirmar, responder } = useConfirmar();
  // Panel del gato y chat de errores de esta sesión, como en Fundamentos.
  const chat = useChatErrores();
  // Reinicios por lenguaje: no tocan veredicto ni pista (solo los quita un envío nuevo).
  const reinicios = useReinicios({
    clave: lenguaje.id,
    codigo,
    plantilla: lenguaje.plantilla,
    poner: (texto) => setBorradores((previos) => ({ ...previos, [lenguaje.id]: texto })),
    confirmar,
  });

  const problema = problemaReal || ejercicio;
  const temaDelProblema = problema
    ? buscarCategoria(categoriaDeProblema({ tags: problema.tags || [], dificultadRating: problema.dificultadRating }))
    : null;
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

  // Sin traducción solo existe el inglés y el conmutador no se muestra.
  const hayTraduccion = Boolean(problema.textos?.es);
  const idioma = hayTraduccion ? idiomaElegido : 'en';
  const texto = problema.textos?.[idioma] || problema;

  const limpiarPista = () => {
    setPistas([]);
    setIdea({ texto: '', cargando: false, error: '' });
    setErrorPista('');
  };

  const cambiarLenguaje = (id) => {
    const siguiente = LENGUAJES.find((l) => l.id === id);
    if (!siguiente || siguiente.id === lenguaje.id) return;
    setLenguaje(siguiente);
  };

  // Veredicto y pista siguen a la vista al teclear, reiniciar o cambiar de lenguaje:
  // solo los quita un envío nuevo.
  // Reiniciar también vacía el chat de errores (si de verdad reinició).
  const reiniciar = async () => {
    if (await reinicios.reiniciar()) chat.vaciar();
  };

  /* La pista se pide aparte del envio: no todos la quieren y cada llamada
     cuesta, asi que sale solo cuando el estudiante la pulsa. */
  const solicitarPista = async () => {
    const nivel = Math.min(nivelAlcanzado + 1, 3);
    setPidiendoPista(true);
    setErrorPista('');
    // La espera arranca al pulsar, no al responder: un fallo del tutor ya
    // consumio presupuesto, asi que reintentar de inmediato tampoco conviene.
    setAhora(Date.now());
    setPistaHasta(Date.now() + ESPERA_PISTA * 1000);
    try {
      const texto = await pedirPista({
        user,
        problemNumber: Number(problema.numero),
        sourceCode: codigo,
        verdict: resultado?.verdict,
        judgeOutput: mensajeDelJuez(resultado) || resultado?.stdout || '',
        language: lenguaje.nombre,
        nivel,
      });
      setPistas((previas) => [...previas, { nivel, texto }]);
      setNivelAlcanzado(nivel);
    } catch (error) {
      setErrorPista(error.message || 'No se pudo pedir la pista.');
    } finally {
      setPidiendoPista(false);
    }
  };

  const verIdea = async () => {
    setIdea({ texto: '', cargando: true, error: '' });
    try {
      setIdea({ texto: await pedirIdeaClave(user, Number(problema.numero)), cargando: false, error: '' });
    } catch (error) {
      setIdea({ texto: '', cargando: false, error: error.message });
    }
  };

  const enviarCodigo = async () => {
    setEvaluando(true);
    setEnviado(false);
    setResultado(null);
    setErrorEnvio('');
    limpiarPista();

    try {
      const lenguajeId = JUDGE0_LANGUAGE_IDS[lenguaje.id];
      const resultadoJudge0 = import.meta.env.VITE_ENABLE_ADAPTIVE === 'true'
        ? await evaluarCodigoAdaptativo(codigo, lenguajeId, problema.numero, user)
        : await evaluarCodigo(codigo, lenguajeId, problema.ejemplos[0]?.entrada, problema.ejemplos[0]?.salida);
      setResultado(resultadoJudge0);
      const explicacion = explicarEnvio(resultadoJudge0);
      chat.registrar(explicacion && {
        ...explicacion,
        diferencia: resultadoJudge0.esperada !== undefined ? textoDeDiferencia(primeraDiferencia(resultadoJudge0.esperada, resultadoJudge0.stdout)) : null,
      });
      setEnviado(true);
      olvidarEscalon();
    } catch (error) {
      setErrorEnvio(error.message || 'No se pudo evaluar el código.');
    } finally {
      setEvaluando(false);
    }
  };

  const cerradoGuiado = bloqueoDe(temaDelProblema?.slug ?? problema.categoria);

  // Lo esencial del tema en el panel del gato, sacado de su lección de la Ruta.
  const leccion = LECCIONES[temaDelProblema?.slug ?? problema.categoria];
  const mensajesGato = leccion
    ? [
      { texto: `Técnica clave del tema: ${leccion.tecnica}. ${leccion.resumen}` },
      ...leccion.cuando.slice(0, 2).map((c) => ({ texto: `Úsala cuando: ${c}` })),
      { texto: 'Si te atascas, repasa la lección con ejemplos interactivos.', enlace: { a: `/dashboard/ruta/${temaDelProblema?.slug ?? problema.categoria}`, texto: 'Repasar la lección →' } },
    ]
    : [
      { texto: 'Lee las restricciones antes de programar: te dicen qué tan rápida debe ser tu idea.' },
      { texto: 'Prueba tu código con los ejemplos y con casos borde: n = 1, ceros, negativos y valores máximos.' },
      { texto: 'La Ruta tiene lecciones de cada tema con ejemplos interactivos.', enlace: { a: '/dashboard/ruta', texto: 'Ir a la Ruta →' } },
    ];

  return (
    <div className="nb-fd-vista">
    <div className="nb-fd-vista-main">
      <Link to={`/dashboard/problemas/${slug}`} className="nb-pb-back">
        ← Volver a {volverA}
      </Link>

      <div className={`nb-ex${expandido ? ' is-expanded' : ''}`}>

        {/* ══ Columna izquierda: el enunciado ══ */}
        <div className="nb-ex-left">

          {/* Nombre del ejercicio + número */}
          <div
            className="nb-ex-card nb-ex-title-card"
            style={{ '--cat-bg': categoria?.bgSuave || 'var(--nb-blue)', '--cat-ink': categoria?.inkSuave || '#fff' }}
          >
            <div className="nb-ex-title-main">
              <div className="nb-ex-kicker">{categoria?.titulo || 'Problema'}</div>
              <h1 className="nb-ex-title" lang={hayTraduccion ? idioma : undefined}>{texto.titulo}</h1>
            </div>

            <div className="nb-ex-title-side">
              {hayTraduccion && <IdiomaSwitch idioma={idioma} onCambiar={cambiarIdioma} />}
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
          {/* Modo guiado de la clase: se puede leer el problema, pero no enviar hasta dominar el tema anterior. */}
          {cerradoGuiado && (
            <p className="nb-ex-escalon is-cerrado">
              <span className="nb-pb-escalon">Tema cerrado</span>
              Tu docente activó la ruta guiada: domina {cerradoGuiado.requiere.titulo} ({cerradoGuiado.requiere.hechos} de {cerradoGuiado.requiere.meta}) para enviar problemas de {cerradoGuiado.titulo}. <Link to={`/dashboard/ruta/${cerradoGuiado.requiere.slug}`}>Ir a la lección →</Link>
            </p>
          )}
          {/* Bloqueo suave (S4): se puede enviar igual, solo se avisa. */}
          {escalon && problema.nivel > escalon.actual && (
            <p className="nb-ex-escalon">
              <span className="nb-pb-escalon">Fuera de tu escalón</span>
              Puedes intentarlo, pero te conviene afianzar antes los de nivel «{NIVELES[escalon.actual]}».
            </p>
          )}

          {/* Descripción */}
          <Plegable titulo="Descripción" abiertoInicial>
            <Enunciado bloques={texto.descripcion} lang={hayTraduccion ? idioma : undefined} />
          </Plegable>

          {/* Entrada y salida */}
          <Plegable titulo="Entrada y salida">
            <h3 className="nb-ex-h3">Entrada</h3>
            <p className="nb-ex-text">{problema.entrada}</p>
            <h3 className="nb-ex-h3" style={{ marginTop: 'var(--sp-gap)' }}>Salida</h3>
            <p className="nb-ex-text">{problema.salida}</p>
          </Plegable>

          {/* Ejemplos */}
          <Plegable titulo="Ejemplos">
            <div className="nb-ex-samples">
              {problema.ejemplos.map((ej, i) => (
                <Ejemplo key={ej.salida} n={i + 1} entrada={ej.entrada} salida={ej.salida} />
              ))}
            </div>
          </Plegable>
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

            <button type="button" className="nb-ex-send" onClick={enviarCodigo} disabled={evaluando || Boolean(cerradoGuiado)} title={cerradoGuiado ? `Domina ${cerradoGuiado.requiere.titulo} para enviar` : undefined}>
              {evaluando ? 'Evaluando…' : 'Enviar'}
            </button>
          </div>

          <Editor
            codigo={codigo}
            lenguajeId={lenguaje.id}
            onChange={(v) => setBorradores((previos) => ({ ...previos, [lenguaje.id]: v }))}
            expandido={expandido}
            onExpandir={() => setExpandido((v) => !v)}
            claro={temaClaro}
            onTema={() => setTemaClaro((v) => !v)}
            onReiniciar={reiniciar}
            onRetroceder={reinicios.retroceder}
            onAdelantar={reinicios.adelantar}
            puedeRetroceder={reinicios.puedeRetroceder}
            puedeAdelantar={reinicios.puedeAdelantar}
            tabulador
            archivo={nombreDeArchivo(lenguaje.id, problema.numero, codigo)}
          />
          <ConfirmarDialogo pedido={pedido} onRespuesta={responder} />

          <div className={`nb-ex-feedback${errorEnvio ? ' is-fail' : enviado && resultado?.verdict ? (resultado.verdict === 'ACCEPTED' ? ' is-ok' : ' is-fail') : ''}`}>
            <img className="nb-ex-cat" src="/cat-pixel.png" alt="" width="512" height="512" aria-hidden="true" />
            <div className="nb-ex-feedback-main">
              <div className="nb-ex-feedback-title">
                {errorEnvio
                  ? 'No se pudo evaluar'
                  : enviado
                    ? (VEREDICTOS_ES[resultado?.verdict] || resultado?.verdict)
                    : '¡Resuélvelo primero, vamos!'}
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
                  {/* Lo que este envío significa para su avance (S5); solo con el juez adaptativo. */}
                  {resultado.intento > 0 && (
                    <div className="nb-ex-feedback-metrics">
                      <span>Intento: <strong>{resultado.intento}</strong></span>
                      {resultado.ratingChange !== 0 && (
                        <span>Nivel: <strong>{resultado.ratingChange > 0 ? '+' : ''}{resultado.ratingChange}</strong></span>
                      )}
                      {resultado.casoFallido > 0 && <span>Falló en el caso: <strong>{resultado.casoFallido}</strong></span>}
                      {resultado.verdict !== 'ACCEPTED' && temaDelProblema && (
                        <Link className="nb-ex-feedback-repaso" to={`/dashboard/problemas/${temaDelProblema.slug}`}>
                          Repasa {temaDelProblema.titulo} →
                        </Link>
                      )}
                    </div>
                  )}
                  {/* Solo llega si falló un ejemplo visible: los casos ocultos no traen entrada ni esperada. */}
                  {resultado.esperada !== undefined && (
                    <>
                      <p className="nb-ex-feedback-text nb-ex-diferencia">{textoDeDiferencia(primeraDiferencia(resultado.esperada, resultado.stdout))}</p>
                      <div className="nb-ex-feedback-output">
                        <span className="nb-ex-feedback-label">Entrada del ejemplo</span>
                        <pre>{resultado.entrada || '(sin entrada)'}</pre>
                      </div>
                      <div className="nb-ex-feedback-output">
                        <span className="nb-ex-feedback-label">Salida esperada</span>
                        <pre>{resultado.esperada || '(sin salida)'}</pre>
                      </div>
                    </>
                  )}
                  {resultado.stdout !== undefined && (
                    <div className="nb-ex-feedback-output">
                      <span className="nb-ex-feedback-label">{resultado.esperada !== undefined ? 'Tu salida' : 'Salida'}</span>
                      <pre>{resultado.stdout || '(sin salida)'}</pre>
                    </div>
                  )}
                  {/* Mensaje del compilador o del error de ejecución (también en el modo adaptativo). */}
                  {mensajeDelJuez(resultado) && <pre className="nb-ex-feedback-text nb-ex-feedback-error nb-ex-mensaje-juez">{mensajeDelJuez(resultado)}</pre>}

                  {/* El tutor solo entra cuando hay algo que orientar. */}
                  {resultado.verdict && resultado.verdict !== 'ACCEPTED' && (
                    <div className="nb-ex-tutor">
                      {/* Tres niveles, uno tras otro: orienta, nombra la técnica y da el esquema. */}
                      {pistas.map((p) => (
                        <div key={p.nivel} className="nb-ex-tutor-pista">
                          <span className="nb-ex-feedback-label">Pista {p.nivel} de 3 · {NIVELES_PISTA[p.nivel]}</span>
                          <p className="nb-ex-feedback-text">{p.texto}</p>
                        </div>
                      ))}
                      {errorPista && <p className="nb-ex-feedback-text nb-ex-feedback-error">{errorPista}</p>}
                      {nivelAlcanzado < 3 ? (
                        <button
                          type="button"
                          className="nb-ex-tutor-btn"
                          onClick={solicitarPista}
                          disabled={pidiendoPista || esperaPista > 0}
                          title={esperaPista > 0 ? 'Intenta algo mas antes de pedir otra pista' : undefined}
                        >
                          {pidiendoPista
                            ? 'Pensando…'
                            : esperaPista > 0
                              ? `Espera ${esperaPista} s`
                              : `Pedir pista ${nivelAlcanzado + 1} de 3: ${NIVELES_PISTA[nivelAlcanzado + 1]}`}
                        </button>
                      ) : (
                        <p className="nb-ex-feedback-text">Ya usaste las tres pistas: el resto lo descubres tú.</p>
                      )}
                    </div>
                  )}

                  {/* Al resolverlo: la idea clave, para consolidar lo aprendido. */}
                  {resultado.verdict === 'ACCEPTED' && (
                    <div className="nb-ex-tutor">
                      {idea.texto ? (
                        <div className="nb-ex-tutor-pista">
                          <span className="nb-ex-feedback-label">Idea clave · escrita por el tutor de IA</span>
                          <p className="nb-ex-feedback-text">{idea.texto}</p>
                        </div>
                      ) : (
                        <button type="button" className="nb-ex-tutor-btn" onClick={verIdea} disabled={idea.cargando}>
                          {idea.cargando ? 'Pensando…' : 'Ver la idea clave'}
                        </button>
                      )}
                      {idea.error && <p className="nb-ex-feedback-text nb-ex-feedback-error">{idea.error}</p>}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
    <PanelGato titulo={temaDelProblema?.titulo ?? categoria?.titulo ?? 'Problema'} mensajes={mensajesGato} {...chat.panel} />
    </div>
  );
};

// La `key` devuelve el editor a la plantilla al pasar de un problema a otro.
const NIVELES_PISTA = { 1: 'Orientación', 2: 'La técnica', 3: 'El esquema' };

// Java exige que el archivo se llame como su clase pública.
const EXTENSION = { python: 'py', cpp: 'cpp', javascript: 'js', java: 'java' };
const nombreDeArchivo = (lenguajeId, numero, codigo) => {
  if (lenguajeId === 'java') return `${codigo.match(/public\s+class\s+(\w+)/)?.[1] ?? 'Main'}.java`;
  return `problema-${numero}.${EXTENSION[lenguajeId] ?? 'txt'}`;
};

const ProblemDetailPage = () => {
  const { numero } = useParams();
  return <Detalle key={numero} />;
};

export default ProblemDetailPage;
