import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { EVENTO_TUTORIAL, guardarTutorial, iniciarTutorial, leerTutorial } from '../scripts/tutorial';
import { PASOS_DOCENTE, PASOS_ESTUDIANTE } from '../scripts/tutorialPasos';

const ESPERA_ANCLA_MS = 2000;

/**
 * Recorrido guiado: tarjetas fijas abajo (en la pila de avisos) que señalan con un contorno azul
 * el elemento real de cada paso. La primera vez se ofrece; después se repite desde la Guía.
 * `listo`: el estudiante ya respondió el aviso de cookies (para no apilar dos preguntas).
 */
const Tutorial = ({ listo }) => {
  const { user, isAdmin } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [estado, setEstado] = useState(() => (user ? leerTutorial(user.uid) : null));
  // { ancla, visible }: si el elemento del paso apareció a tiempo.
  const [anclaVisible, setAnclaVisible] = useState(null);
  const tituloRef = useRef(null);
  const pasos = isAdmin ? PASOS_DOCENTE : PASOS_ESTUDIANTE;
  const enCurso = estado?.estado === 'en-curso';
  const indice = enCurso ? Math.min(estado.paso, pasos.length - 1) : 0;
  const paso = pasos[indice];
  const enSuRuta = enCurso && paso.ruta.test(pathname);

  const guardar = (valor) => user && guardarTutorial(user.uid, valor);
  const irA = (n, enfocar = false) => {
    guardar({ estado: 'en-curso', paso: n });
    // El foco solo se mueve cuando avanza con el botón: no se roba del editor ni de la navegación.
    if (enfocar) setTimeout(() => tituloRef.current?.focus(), 0);
  };
  const salir = () => guardar({ estado: 'saltado', paso: 0 });
  const terminar = () => guardar({ estado: 'hecho', paso: 0 });

  // Cambios desde la Guía o desde otra pestaña de este mismo usuario.
  useEffect(() => {
    const alCambiar = (e) => setEstado(e.detail);
    window.addEventListener(EVENTO_TUTORIAL, alCambiar);
    return () => window.removeEventListener(EVENTO_TUTORIAL, alCambiar);
  }, []);

  // Avanza solo al llegar a la ruta del paso siguiente.
  useEffect(() => {
    if (!enCurso || paso.avanza !== 'ruta') return;
    const siguiente = pasos[indice + 1];
    if (siguiente?.ruta.test(pathname)) guardarTutorial(user.uid, { estado: 'en-curso', paso: indice + 1 });
  }, [enCurso, paso, pasos, indice, pathname, user]);

  // Avanza con un evento de la página (el primer envío).
  useEffect(() => {
    if (!enCurso || !paso.avanza.startsWith('codecomp:')) return undefined;
    const alOcurrir = () => guardarTutorial(user.uid, { estado: 'en-curso', paso: indice + 1 });
    window.addEventListener(paso.avanza, alOcurrir);
    return () => window.removeEventListener(paso.avanza, alOcurrir);
  }, [enCurso, paso, indice, user]);

  // Resalta el ancla cuando aparece (puede cargar después); si no aparece, texto de respaldo.
  useEffect(() => {
    if (!enSuRuta || !paso.ancla) return undefined;
    let elemento = null;
    let vigente = true;
    const inicio = Date.now();
    const buscar = () => {
      if (!vigente) return;
      elemento = document.querySelector(`[data-tour="${paso.ancla}"]`);
      if (elemento) {
        elemento.classList.add('nb-tour-foco');
        elemento.scrollIntoView({ block: 'nearest', inline: 'center' });
        setAnclaVisible({ ancla: paso.ancla, visible: true });
      } else if (Date.now() - inicio < ESPERA_ANCLA_MS) {
        setTimeout(buscar, 200);
      } else {
        setAnclaVisible({ ancla: paso.ancla, visible: false });
      }
    };
    setTimeout(buscar, 0);
    return () => {
      vigente = false;
      elemento?.classList.remove('nb-tour-foco');
    };
  }, [enSuRuta, paso, pathname]);

  if (!user || !estado) return null;

  // Primera vez: se ofrece, después del aviso de cookies.
  if (estado.estado === 'ofrecido') {
    if (!listo) return null;
    return (
      <aside className="nb-dash-card nb-dash-aviso is-corto nb-tour" aria-label="Recorrido guiado">
        <p className="nb-dash-aviso-text">
          <strong>¿Quieres un recorrido guiado?</strong>{' '}
          {isAdmin ? 'Te mostramos cómo crear tu clase y acompañar a tus estudiantes.' : 'Te acompañamos en tu primer envío, paso a paso.'}
        </p>
        <div className="nb-cuenta-acciones">
          <button type="button" className="nb-ex-send" onClick={() => { iniciarTutorial(user.uid); navigate(pasos[0].ir); }}>Empezar</button>
          <button type="button" className="nb-dash-btn-claro" onClick={salir}>Ahora no</button>
        </div>
      </aside>
    );
  }
  if (!enCurso) return null;

  // Fuera de la ruta del paso: en pausa, con la forma de volver.
  if (!enSuRuta) {
    return (
      <aside className="nb-dash-card nb-dash-aviso is-corto nb-tour" aria-label="Recorrido guiado">
        <p className="nb-dash-aviso-text"><strong>Recorrido en pausa</strong> · paso {indice + 1} de {pasos.length}</p>
        <div className="nb-cuenta-acciones">
          <button type="button" className="nb-ex-send" onClick={() => navigate(paso.ir)}>Volver al paso</button>
          <button type="button" className="nb-dash-btn-claro" onClick={salir}>Salir</button>
        </div>
      </aside>
    );
  }

  const ultimo = paso.avanza === 'fin';
  const sinAncla = paso.ancla && anclaVisible?.ancla === paso.ancla && !anclaVisible.visible;
  const atras = () => {
    irA(indice - 1, true);
    if (!pasos[indice - 1].ruta.test(pathname)) navigate(pasos[indice - 1].ir);
  };
  return (
    <aside
      className="nb-dash-card nb-dash-aviso nb-tour"
      role="region"
      aria-label="Recorrido guiado"
      onKeyDown={(e) => { if (e.key === 'Escape') salir(); }}
    >
      <div className="nb-dash-kicker">Paso {indice + 1} de {pasos.length}</div>
      <h2 className="nb-tour-titulo" tabIndex={-1} ref={tituloRef} aria-live="polite">{paso.titulo}</h2>
      <p className="nb-dash-aviso-text">{sinAncla && paso.respaldo ? paso.respaldo : paso.texto}</p>
      {ultimo && <p className="nb-dash-aviso-text"><Link to="/guia">Leer la Guía</Link></p>}
      <div className="nb-cuenta-acciones">
        {indice > 0 && <button type="button" className="nb-dash-btn-claro" onClick={atras}>Anterior</button>}
        {paso.avanza === 'boton' && <button type="button" className="nb-ex-send" onClick={() => irA(indice + 1, true)}>Siguiente</button>}
        {ultimo && <button type="button" className="nb-ex-send" onClick={terminar}>Terminar</button>}
        {!ultimo && <button type="button" className="nb-cuenta-revocar nb-tour-salir" onClick={salir}>Salir del recorrido</button>}
      </div>
    </aside>
  );
};

export default Tutorial;
