import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { auth } from '../scripts/firebaseConfig';
import { iniciarTutorial } from '../scripts/tutorial';
import { HeroInfo, SeccionInfo } from '../components/PaginaInfo';
import { CollapseIcon, ExpandIcon } from '../components/AppIcons';

// Textos borrador: los decide el equipo.
const SECCIONES = [
  {
    id: 'que-es',
    titulo: 'Qué es CODECOMP',
    cuerpo: (
      <>
        <p>Una plataforma de programación competitiva para el grupo de maratón de Ingeniería de Sistemas de la UFPS Ocaña. Practicas con ejercicios que se califican al instante, recibes pistas de un tutor de IA y ves cómo mejora tu nivel.</p>
      </>
    ),
  },
  {
    id: 'primeros-pasos',
    titulo: 'Primeros pasos',
    cuerpo: (
      <>
        <ol>
          <li><strong>Crea tu cuenta</strong> con tu correo (mejor el institucional) o entra con Google o GitHub.</li>
          <li><strong>Completa tu perfil</strong> con tu nombre y tu código de 7 dígitos de la UFPSO.</li>
          <li><strong>Únete a tu clase</strong> en el tablero, con el código de 6 letras que te da tu docente.</li>
          <li><strong>Empieza por Fundamentos</strong> si estás aprendiendo, o por Problemas si ya programas.</li>
        </ol>
      </>
    ),
  },
  {
    id: 'fundamentos',
    titulo: 'Fundamentos (PSeInt)',
    cuerpo: (
      <>
        <p>Ejercicios para aprender a programar en PSeInt, ordenados por tema y dificultad. En cada uno lees el enunciado, escribes tu algoritmo en el editor y pulsas <strong>Enviar</strong>.</p>
        <ul>
          <li><strong>Aceptado:</strong> tu algoritmo pasó los ejemplos y los casos ocultos.</li>
          <li><strong>Respuesta incorrecta:</strong> la salida no coincide. Si falla un ejemplo, ves la entrada, lo esperado y lo tuyo; si falla un caso oculto, no se muestra cuál, para que pienses qué entradas no contemplas.</li>
          <li><strong>Error en la línea N:</strong> PSeInt no pudo ejecutar esa línea; el mensaje explica por qué.</li>
          <li><strong>Pedir retroalimentación:</strong> el tutor de IA te da una pista sin darte la solución. Hay que esperar un minuto entre pistas.</li>
        </ul>
        <p>Tu borrador se guarda solo, así que puedes salir y volver.</p>
      </>
    ),
  },
  {
    id: 'problemas',
    titulo: 'Problemas',
    cuerpo: (
      <>
        <p>Problemas de programación competitiva por categoría y dificultad, en inglés o español (lo eliges con el botón ES / EN). Escribe tu solución en Python, C++, Java u otro lenguaje disponible y envíala: el juez la prueba con todos los casos.</p>
        <p>Veredictos: <strong>Aceptado</strong>, <strong>Respuesta incorrecta</strong>, <strong>Tiempo excedido</strong> (tu solución es lenta), <strong>Error de ejecución</strong> y <strong>Error de compilación</strong>.</p>
        <ul>
          <li><strong>Pistas en tres niveles:</strong> la primera te orienta con una pregunta, la segunda nombra la técnica y la tercera da un esquema en palabras. Nunca te dan el código. Hay que esperar un minuto entre pistas.</li>
          <li><strong>Idea clave:</strong> al resolver un problema puedes ver la observación principal que lo resuelve, para afianzar lo aprendido.</li>
          <li><strong>Panel del gato:</strong> a la derecha resume el tema del problema y, si fallas, guarda tus errores de la sesión explicados con palabras sencillas.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'ruta',
    titulo: 'Ruta de entrenamiento',
    cuerpo: (
      <>
        <p>La <Link to="/dashboard/ruta">Ruta</Link> te guía tema por tema, de lo básico a grafos: Principiante, Ad-Hoc, Cadenas, Matemáticas, Estructuras de datos, Paradigmas, Grafos y Geometría. Dominas un tema al resolver 5 de sus problemas.</p>
        <ul>
          <li><strong>Lección de cada tema:</strong> lo básico de la categoría con ejemplos que puedes probar, la técnica clave, un ejemplo resuelto con código en C++ y Python, una visualización paso a paso con tus propios datos y preguntas para comprobar que entendiste.</li>
          <li><strong>Práctica:</strong> al final de cada lección, problemas del tema a tu altura.</li>
          <li><strong>Tu repaso de hoy:</strong> en el Inicio te proponemos problemas de los temas donde más fallas o que hace días no practicas.</li>
          <li><strong>Resueltos por tu cuenta:</strong> los problemas que aceptaste sin pedir ninguna pista.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'nivel',
    titulo: 'Nivel, escalón y racha',
    cuerpo: (
      <>
        <ul>
          <li><strong>Nivel:</strong> un número que sube cuando resuelves problemas difíciles para ti y baja poco cuando fallas. Solo cuenta Problemas.</li>
          <li><strong>Escalón:</strong> la dificultad que te recomendamos, de Muy fácil a Muy difícil. Subes al resolver 5 problemas de tu escalón o al alcanzar el nivel.</li>
          <li><strong>Racha:</strong> días seguidos en los que enviaste algo.</li>
        </ul>
        <p>Todo esto lo ves en <Link to="/dashboard/progreso">Mi progreso</Link>.</p>
      </>
    ),
  },
  {
    id: 'competencias',
    titulo: 'Competencias',
    cuerpo: (
      <>
        <p>Tu docente organiza competencias por equipos, como en la maratón. Durante la competencia ves los problemas, envías soluciones, consultas el marcador y haces preguntas al jurado. Te avisamos un día y una hora antes de que empiece.</p>
      </>
    ),
  },
  {
    id: 'avisos',
    titulo: 'Avisos',
    cuerpo: (
      <>
        <p>La campana de arriba muestra tus avisos: mensajes de tu docente, competencias por empezar, problemas a punto de cerrarse y logros. Algunos también llegan por correo; puedes apagarlos en Mi cuenta.</p>
      </>
    ),
  },
  {
    id: 'cuenta',
    titulo: 'Mi cuenta y tus datos',
    cuerpo: (
      <>
        <p>En <Link to="/dashboard/cuenta">Mi cuenta</Link> cambias tu foto, tu nombre y tu código, ves tus logros, cierras sesión en todos tus dispositivos, descargas tus datos o pides que los borremos. Lee cómo los usamos en la <Link to="/privacidad">política de tratamiento de datos</Link>.</p>
      </>
    ),
  },
  {
    id: 'docentes',
    titulo: 'Para docentes',
    cuerpo: (
      <>
        <ul>
          <li><strong>Crea una clase</strong> en el tablero y comparte el código de 6 letras con tus estudiantes.</li>
          <li><strong>Estudiantes:</strong> el panel muestra quién practica, qué le cuesta y alertas de quien lleva días sin entrar. Toca a un estudiante para ver su ficha.</li>
          <li><strong>Avisar a la clase:</strong> hasta 3 avisos al día, a la campana y por correo.</li>
          <li><strong>Competencias:</strong> desde el panel del jurado creas la competencia, armas los equipos, eliges los problemas y respondes aclaraciones.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'accesibilidad',
    titulo: 'Accesibilidad',
    cuerpo: (
      <>
        <p>Puedes usar CODECOMP solo con el teclado: <kbd>Tab</kbd> recorre los controles y el foco siempre se ve con un contorno azul. Los formularios dicen qué falta y dan un ejemplo de lo que va en cada campo. Si algo no te funciona, escríbenos a <a href="mailto:afsalasn@ufpso.edu.co">afsalasn@ufpso.edu.co</a>.</p>
      </>
    ),
  },
  {
    id: 'preguntas',
    titulo: 'Preguntas frecuentes',
    cuerpo: (
      <>
        <p><strong>No me llegó el correo para cambiar la contraseña.</strong> Revisa spam y espera unos minutos. Si entras con Google, no tienes contraseña en CODECOMP.</p>
        <p><strong>Mi código tenía 6 dígitos.</strong> Desde 2026 son 7: actualízalo en Mi cuenta.</p>
        <p><strong>¿Por qué no veo la entrada del caso que falló?</strong> Los casos ocultos se guardan en secreto para que la solución sea general, no hecha a la medida de los ejemplos.</p>
      </>
    ),
  },
];

const POR_PAGINA = 2;
const PAGINAS = Math.ceil(SECCIONES.length / POR_PAGINA);
const MOVIL = '(max-width: 900px)';

/** Posición de la sección del hash; -1 si no hay hash o no existe. */
const indiceDe = (hash) => SECCIONES.findIndex((s) => `#${s.id}` === hash);
const enMovil = () => window.matchMedia(MOVIL).matches;

/**
 * Guía de uso: índice de alto completo a la izquierda (se pliega a una tira de números; en
 * móvil es un panel que se abre encima) y dos secciones por página. La página sale del hash.
 */
const GuiaPage = () => {
  const navigate = useNavigate();
  const { hash } = useLocation();
  const [plegado, setPlegado] = useState(false);
  const [abierto, setAbierto] = useState(false);
  const [movil, setMovil] = useState(enMovil);
  const tituloRef = useRef(null);
  const menuRef = useRef(null);
  const panelRef = useRef(null);
  const yaCargo = useRef(false);

  const indice = indiceDe(hash);
  const pagina = indice < 0 ? 0 : Math.floor(indice / POR_PAGINA);
  const desde = pagina * POR_PAGINA;
  const visibles = SECCIONES.slice(desde, desde + POR_PAGINA);
  const idFoco = indice < 0 ? visibles[0].id : SECCIONES[indice].id;
  const primeraDePagina = idFoco === visibles[0].id;
  const panelMovilAbierto = movil && abierto;
  // En la página 1 el h1 es el de la banda azul; en las demás, el del índice.
  const EtiquetaIndice = pagina === 0 ? 'p' : 'h1';

  useEffect(() => { document.title = 'Guía de uso · CODECOMP'; }, []);

  useEffect(() => {
    const consulta = window.matchMedia(MOVIL);
    const alCambiar = () => setMovil(consulta.matches);
    consulta.addEventListener('change', alCambiar);
    return () => consulta.removeEventListener('change', alCambiar);
  }, []);

  // Al cambiar de página, la sección elegida queda arriba y con el foco (no en la primera carga).
  useEffect(() => {
    if (!yaCargo.current) { yaCargo.current = true; return; }
    tituloRef.current?.focus({ preventScroll: true });
    if (primeraDePagina) window.scrollTo(0, 0);
    else document.getElementById(idFoco)?.scrollIntoView({ block: 'start' });
  }, [hash, idFoco, primeraDePagina]);

  // Panel móvil abierto: el foco entra al panel, Escape lo cierra y el fondo no se desplaza.
  useEffect(() => {
    if (!panelMovilAbierto) return undefined;
    // Se espera un cuadro: antes el panel sigue oculto y no puede recibir el foco.
    const cuadro = requestAnimationFrame(() => panelRef.current?.focus());
    const alTecla = (e) => {
      if (e.key !== 'Escape') return;
      setAbierto(false);
      menuRef.current?.focus();
    };
    const desborde = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', alTecla);
    return () => {
      cancelAnimationFrame(cuadro);
      document.body.style.overflow = desborde;
      document.removeEventListener('keydown', alTecla);
    };
  }, [panelMovilAbierto]);

  const cerrarPanel = () => { setAbierto(false); menuRef.current?.focus(); };
  const irA = (id) => {
    setAbierto(false);
    navigate({ hash: `#${id}` }, { replace: true });
  };
  const volver = () => (window.history.length > 1 ? navigate(-1) : navigate('/dashboard'));
  // El recorrido vive en el tablero: se deja marcado y se va hacia allá.
  const repetir = () => {
    const uid = auth?.currentUser?.uid;
    if (!uid) return navigate('/', { state: { openLogin: true } });
    iniciarTutorial(uid);
    return navigate('/dashboard');
  };

  const anterior = pagina > 0 ? SECCIONES[desde - POR_PAGINA] : null;
  const siguiente = pagina < PAGINAS - 1 ? SECCIONES[desde + POR_PAGINA] : null;
  const textoPlegar = movil ? 'Cerrar el índice' : plegado ? 'Expandir el índice' : 'Plegar el índice';
  const clases = ['nb-info', 'nb-guia', !movil && plegado && 'is-plegado', panelMovilAbierto && 'is-abierto']
    .filter(Boolean).join(' ');

  return (
    <div className={clases}>
      {/* Franja del alto de la cabecera del tablero, vacía a propósito (pedido de Javier). */}
      <div className="nb-guia-franja" aria-hidden="true" />
      <header className="nb-guia-barra">
        <button
          type="button"
          ref={menuRef}
          className="nb-guia-plegar"
          onClick={() => setAbierto((v) => !v)}
          aria-expanded={panelMovilAbierto}
          aria-controls="guia-indice"
          aria-label="Abrir el índice de la guía"
          title="Índice de la guía"
        >
          <ExpandIcon />
        </button>
        <Link to="/" className="nb-guia-marca" translate="no">CODECOMP</Link>
        <button type="button" className="nb-btn-white nb-guia-barra-volver" onClick={volver}>← Volver</button>
      </header>

      {panelMovilAbierto && <div className="nb-guia-velo" onClick={cerrarPanel} aria-hidden="true" />}

      <aside id="guia-indice" className="nb-guia-side" ref={panelRef} tabIndex={-1} aria-label="Índice de la guía">
        <div className="nb-guia-side-top">
          <button
            type="button"
            className="nb-guia-plegar"
            onClick={() => (movil ? cerrarPanel() : setPlegado((v) => !v))}
            aria-expanded={movil ? panelMovilAbierto : !plegado}
            aria-controls="guia-indice"
            aria-label={textoPlegar}
            title={textoPlegar}
          >
            {plegado && !movil ? <ExpandIcon /> : <CollapseIcon />}
          </button>
          <Link to="/" className="nb-guia-marca" translate="no">CODECOMP</Link>
        </div>
        <EtiquetaIndice className="nb-guia-h1">Guía de uso</EtiquetaIndice>
        <nav className="nb-guia-indice" aria-label="Contenido">
          <ol>
            {SECCIONES.map((s, i) => {
              const numero = String(i + 1).padStart(2, '0');
              return (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    aria-current={i >= desde && i < desde + POR_PAGINA ? 'true' : undefined}
                    aria-label={`${numero}. ${s.titulo}`}
                    title={s.titulo}
                    onClick={(e) => { e.preventDefault(); irA(s.id); }}
                  >
                    <span className="nb-guia-num" aria-hidden="true">{numero}</span>
                    <span className="nb-guia-indice-titulo">{s.titulo}</span>
                  </a>
                </li>
              );
            })}
          </ol>
        </nav>
        <div className="nb-guia-side-foot">
          <button type="button" className="nb-btn-blue" onClick={repetir}>Hacer el recorrido guiado</button>
          <button type="button" className="nb-btn-white" onClick={volver}>← Volver</button>
        </div>
      </aside>

      <div className="nb-guia-main" inert={panelMovilAbierto}>
        {pagina === 0 && (
          <HeroInfo
            kicker="Guía de uso"
            titulo="Cómo usar CODECOMP"
            intro="Todo lo que necesitas para practicar, competir y seguir tu avance. Si prefieres que te mostremos la plataforma paso a paso, haz el recorrido guiado."
          />
        )}

        <main className="nb-guia-pagina">
          {visibles.map((s, i) => (
            <SeccionInfo
              key={s.id}
              id={s.id}
              titulo={s.titulo}
              numero={desde + i + 1}
              tituloRef={s.id === idFoco ? tituloRef : undefined}
            >
              {s.cuerpo}
            </SeccionInfo>
          ))}
          {visibles.length < POR_PAGINA && (
            <div className="nb-guia-oferta">
              <img className="nb-guia-oferta-gato" src="/cat-pixel.png" alt="" width="512" height="512" />
              <div>
                <p className="nb-guia-oferta-titulo">¿Prefieres que te mostremos?</p>
                <p className="nb-guia-oferta-texto">El recorrido guiado te lleva de la mano por la plataforma, paso a paso.</p>
                <button type="button" className="nb-btn-white" onClick={repetir}>Hacer el recorrido guiado</button>
              </div>
            </div>
          )}
        </main>

        <nav className="nb-guia-paginas" aria-label="Páginas de la guía">
          {anterior ? (
            <button type="button" className="nb-guia-pag" onClick={() => irA(anterior.id)}>
              <small>← Anterior</small>
              <span>{anterior.titulo}</span>
            </button>
          ) : <span className="nb-guia-pag-hueco" />}
          <span className="nb-guia-pag-cuenta">Página {pagina + 1} de {PAGINAS}</span>
          {siguiente ? (
            <button type="button" className="nb-guia-pag is-sig" onClick={() => irA(siguiente.id)}>
              <small>Siguiente →</small>
              <span>{siguiente.titulo}</span>
            </button>
          ) : <span className="nb-guia-pag-hueco" />}
        </nav>
      </div>
    </div>
  );
};

export default GuiaPage;
