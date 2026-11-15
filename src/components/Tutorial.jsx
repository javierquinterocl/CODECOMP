import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { EVENTO_TUTORIAL, guardarTutorial, iniciarTutorial, leerTutorial } from '../scripts/tutorial';
import { PASOS_DOCENTE, PASOS_ESTUDIANTE } from '../scripts/tutorialPasos';

const ESPERA_ANCLA_MS = 2000;
const HOLGURA = 8; // espacio entre el elemento y el borde del foco
const SEPARACION = 18; // espacio entre el foco y la tarjeta
const ANCHO_TARJETA = 340;

/** Dónde va la tarjeta respecto al elemento: a la derecha, izquierda, abajo o arriba; en móvil, abajo fija. */
const colocarTarjeta = (r, vw, vh, alto) => {
  if (!r || vw <= 640) return { lado: 'hoja' };
  const centroY = r.top + r.height / 2;
  const centroX = r.left + r.width / 2;
  const topLateral = Math.min(Math.max(centroY - alto / 2, 12), vh - alto - 12);
  if (r.right + SEPARACION + ANCHO_TARJETA <= vw - 12) {
    return { lado: 'derecha', top: topLateral, left: r.right + SEPARACION, flecha: centroY - topLateral };
  }
  if (r.left - SEPARACION - ANCHO_TARJETA >= 12) {
    return { lado: 'izquierda', top: topLateral, left: r.left - SEPARACION - ANCHO_TARJETA, flecha: centroY - topLateral };
  }
  const left = Math.min(Math.max(centroX - ANCHO_TARJETA / 2, 12), vw - ANCHO_TARJETA - 12);
  if (r.bottom + SEPARACION + alto <= vh - 12) {
    return { lado: 'abajo', top: r.bottom + SEPARACION, left, flecha: centroX - left };
  }
  return { lado: 'arriba', top: Math.max(r.top - SEPARACION - alto, 12), left, flecha: centroX - left };
};

/**
 * Recorrido guiado: oscurece la página dejando a la vista el elemento del paso y muestra una
 * tarjeta junto a él. La página sigue usable (el foco no bloquea los clics). La oferta y la
 * pausa van en la pila de avisos. `listo`: ya se respondió el aviso de cookies.
 */
const Tutorial = ({ listo }) => {
  const { user, isAdmin } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [estado, setEstado] = useState(() => (user ? leerTutorial(user.uid) : null));
  // { ancla, rect | null }: dónde está el elemento del paso (null si no apareció a tiempo).
  const [ubicacion, setUbicacion] = useState(null);
  const [alto, setAlto] = useState(220);
  const tarjetaRef = useRef(null);
  const tituloRef = useRef(null);
  const pasos = isAdmin ? PASOS_DOCENTE : PASOS_ESTUDIANTE;
  const enCurso = estado?.estado === 'en-curso';
  const indice = enCurso ? Math.min(estado.paso, pasos.length - 1) : 0;
  const paso = pasos[indice];
  const enSuRuta = enCurso && paso.ruta.test(pathname);

  const guardar = (valor) => user && guardarTutorial(user.uid, valor);
  const irA = (n) => {
    guardar({ estado: 'en-curso', paso: n });
    // El foco solo se mueve con los botones: no se roba del editor ni de la navegación.
    setTimeout(() => tituloRef.current?.focus(), 0);
  };
  const salir = () => guardar({ estado: 'saltado', paso: 0 });
  const terminar = () => guardar({ estado: 'hecho', paso: 0 });

  useEffect(() => {
    const alCambiar = (e) => setEstado(e.detail);
    window.addEventListener(EVENTO_TUTORIAL, alCambiar);
    return () => window.removeEventListener(EVENTO_TUTORIAL, alCambiar);
  }, []);

  // Avanza solo al llegar a la ruta del paso siguiente.
  useEffect(() => {
    if (!enCurso || paso.avanza !== 'ruta') return;
    if (pasos[indice + 1]?.ruta.test(pathname)) guardarTutorial(user.uid, { estado: 'en-curso', paso: indice + 1 });
  }, [enCurso, paso, pasos, indice, pathname, user]);

  // Avanza con un evento de la página (el primer envío).
  useEffect(() => {
    if (!enCurso || !paso.avanza.startsWith('codecomp:')) return undefined;
    const alOcurrir = () => guardarTutorial(user.uid, { estado: 'en-curso', paso: indice + 1 });
    window.addEventListener(paso.avanza, alOcurrir);
    return () => window.removeEventListener(paso.avanza, alOcurrir);
  }, [enCurso, paso, indice, user]);

  // Sigue al elemento del paso (puede cargar tarde, desplazarse o cambiar de tamaño).
  useEffect(() => {
    if (!enSuRuta || !paso.ancla) return undefined;
    let vigente = true;
    let cuadro = 0;
    let anterior = '';
    const inicio = Date.now();
    const seguir = (elemento) => {
      if (!vigente) return;
      const r = elemento.getBoundingClientRect();
      const clave = `${r.top}|${r.left}|${r.width}|${r.height}`;
      if (clave !== anterior) {
        anterior = clave;
        setUbicacion({ ancla: paso.ancla, rect: { top: r.top, left: r.left, width: r.width, height: r.height, right: r.right, bottom: r.bottom } });
      }
      cuadro = requestAnimationFrame(() => seguir(elemento));
    };
    const buscar = () => {
      if (!vigente) return;
      const elemento = document.querySelector(`[data-tour="${paso.ancla}"]`);
      if (elemento) {
        elemento.scrollIntoView({ block: 'nearest', inline: 'center' });
        seguir(elemento);
      } else if (Date.now() - inicio < ESPERA_ANCLA_MS) {
        setTimeout(buscar, 200);
      } else {
        setUbicacion({ ancla: paso.ancla, rect: null });
      }
    };
    setTimeout(buscar, 0);
    return () => { vigente = false; cancelAnimationFrame(cuadro); };
  }, [enSuRuta, paso, pathname]);

  // La altura real de la tarjeta decide si cabe arriba o abajo.
  useEffect(() => {
    const tarjeta = tarjetaRef.current;
    if (!tarjeta || typeof ResizeObserver === 'undefined') return undefined;
    const observador = new ResizeObserver(([entrada]) => setAlto(Math.round(entrada.contentRect.height) + 40));
    observador.observe(tarjeta);
    return () => observador.disconnect();
  });

  if (!user || !estado) return null;

  if (estado.estado === 'ofrecido') {
    if (!listo) return null;
    return (
      <aside className="nb-dash-card nb-dash-aviso nb-tour-oferta" aria-label="Recorrido guiado">
        <img className="nb-tour-gato nb-cat-float" src="/cat-pixel.png" alt="" width="512" height="512" />
        <div>
          <p className="nb-dash-aviso-text">
            <strong>¿Te damos un recorrido?</strong>{' '}
            {isAdmin ? 'Te mostramos cómo crear tu clase y acompañar a tus estudiantes.' : 'Te acompañamos en tu primer envío, paso a paso.'}
          </p>
          <div className="nb-cuenta-acciones">
            <button type="button" className="nb-ex-send" onClick={() => { iniciarTutorial(user.uid); navigate(pasos[0].ir); }}>Empezar</button>
            <button type="button" className="nb-dash-btn-claro" onClick={salir}>Ahora no</button>
          </div>
        </div>
      </aside>
    );
  }
  if (!enCurso) return null;

  if (!enSuRuta) {
    return (
      <aside className="nb-dash-card nb-dash-aviso is-corto nb-tour-pausa" aria-label="Recorrido guiado">
        <p className="nb-dash-aviso-text"><strong>Recorrido en pausa</strong> · paso {indice + 1} de {pasos.length}</p>
        <div className="nb-cuenta-acciones">
          <button type="button" className="nb-ex-send" onClick={() => navigate(paso.ir)}>Volver al paso</button>
          <button type="button" className="nb-dash-btn-claro" onClick={salir}>Salir</button>
        </div>
      </aside>
    );
  }

  const rect = paso.ancla && ubicacion?.ancla === paso.ancla ? ubicacion.rect : null;
  const buscando = paso.ancla && ubicacion?.ancla !== paso.ancla;
  const sinAncla = paso.ancla && ubicacion?.ancla === paso.ancla && !rect;
  // El hueco no se sale de la pantalla (el menú va pegado al borde izquierdo).
  const hueco = rect && (() => {
    const left = Math.max(rect.left - HOLGURA, 3);
    const top = Math.max(rect.top - HOLGURA, 3);
    const right = Math.min(rect.right + HOLGURA, window.innerWidth - 3);
    const bottom = Math.min(rect.bottom + HOLGURA, window.innerHeight - 3);
    return { top, left, width: right - left, height: bottom - top };
  })();
  const pos = hueco
    ? colocarTarjeta({ ...hueco, right: hueco.left + hueco.width, bottom: hueco.top + hueco.height }, window.innerWidth, window.innerHeight, alto)
    : { lado: 'centro' };
  const ultimo = paso.avanza === 'fin';
  const atras = () => {
    irA(indice - 1);
    if (!pasos[indice - 1].ruta.test(pathname)) navigate(pasos[indice - 1].ir);
  };
  const estiloTarjeta = pos.lado === 'centro' || pos.lado === 'hoja'
    ? undefined
    : { top: pos.top, left: pos.left, '--tour-flecha': `${pos.flecha}px` };

  return createPortal(
    <>
      {/* Sin elemento (bienvenida o respaldo) se oscurece todo; con elemento, todo menos él. */}
      {hueco
        ? <div className="nb-tour-foco" style={hueco} aria-hidden="true" />
        : !buscando && <div className="nb-tour-velo" aria-hidden="true" />}
      {!buscando && (
        <section
          ref={tarjetaRef}
          className={`nb-tour-tarjeta is-${pos.lado}`}
          style={estiloTarjeta}
          aria-label="Recorrido guiado"
          onKeyDown={(e) => { if (e.key === 'Escape') salir(); }}
        >
          <div className="nb-tour-cabeza">
            <img className="nb-tour-gato" src="/cat-pixel.png" alt="" width="512" height="512" />
            <div className="nb-tour-puntos" aria-label={`Paso ${indice + 1} de ${pasos.length}`}>
              {pasos.map((p, i) => <span key={p.titulo} className={i === indice ? 'is-actual' : i < indice ? 'is-hecho' : ''} />)}
            </div>
            <button type="button" className="nb-tour-cerrar" onClick={salir} aria-label="Salir del recorrido" title="Salir del recorrido">×</button>
          </div>
          <h2 className="nb-tour-titulo" tabIndex={-1} ref={tituloRef} aria-live="polite">{paso.titulo}</h2>
          <p className="nb-tour-texto">{sinAncla && paso.respaldo ? paso.respaldo : paso.texto}</p>
          {ultimo && <Link className="nb-tour-enlace" to="/guia">Leer la Guía completa →</Link>}
          <div className="nb-tour-acciones">
            <span className="nb-tour-cuenta">{indice + 1} / {pasos.length}</span>
            {indice > 0 && <button type="button" className="nb-dash-btn-claro" onClick={atras}>Anterior</button>}
            {paso.avanza === 'boton' && <button type="button" className="nb-ex-send" onClick={() => irA(indice + 1)}>Siguiente</button>}
            {ultimo && <button type="button" className="nb-ex-send" onClick={terminar}>Terminar</button>}
          </div>
        </section>
      )}
    </>,
    document.body,
  );
};

export default Tutorial;
