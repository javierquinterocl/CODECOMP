import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { EVENTO_DATOS, getDatos, responderDatos } from '../scripts/registroApi';
import useActividad from '../scripts/useActividad';

// Textos borrador: los aprueba el equipo.
const CORTO = 'Usamos cookies para mantener tu sesión y, si aceptas, registrar tu actividad para mostrarte tu progreso y que tu docente pueda acompañarte.';
const DETALLE = 'Registramos el tiempo que pasas activo y en cada ejercicio, cuándo abres cada problema y cuántas veces pegas código (solo el tamaño, nunca el contenido). Tus envíos y las pistas del tutor se guardan siempre porque son parte del servicio. Los avisos por correo se envían con Resend (servidores en EE. UU.) y puedes apagarlos en Mi cuenta. Los datos se usan solo con fines académicos en la UFPS Ocaña (Ley 1581 de 2012) y la actividad se guarda 12 meses. Puedes cambiar tu decisión cuando quieras en Mi cuenta.';

/** Aviso de cookies la primera vez y, si el estudiante acepta, registro de la actividad. */
const RegistroEstudiante = () => {
  const { user } = useAuth();
  // undefined: cargando o sin sesión; null: aún no responde.
  const [autorizado, setAutorizado] = useState(undefined);
  const [guardando, setGuardando] = useState(false);
  const [detalle, setDetalle] = useState(false);

  useEffect(() => {
    if (!user) return undefined;
    let vigente = true;
    getDatos(user)
      .then((data) => { if (vigente) setAutorizado(data.autorizado); })
      .catch(() => {});
    // Si la cambia en Mi cuenta, el registro se enciende o se apaga sin recargar.
    const alCambiar = (e) => setAutorizado(e.detail);
    window.addEventListener(EVENTO_DATOS, alCambiar);
    return () => { vigente = false; window.removeEventListener(EVENTO_DATOS, alCambiar); };
  }, [user]);

  // La ruta va en un ref: el registro no se reinicia al navegar, solo sabe en qué ejercicio está.
  const { pathname } = useLocation();
  const rutaRef = useRef(pathname);
  useEffect(() => { rutaRef.current = pathname; }, [pathname]);

  useActividad(user, autorizado === true, rutaRef);

  if (!user || autorizado !== null) return null;

  const responder = async (acepta) => {
    setGuardando(true);
    try {
      const data = await responderDatos(user, acepta);
      setAutorizado(data.autorizado);
    } catch {
      setGuardando(false);
    }
  };

  return (
    <aside className="nb-dash-card nb-dash-aviso is-corto" role="dialog" aria-label="Aviso de cookies">
      <p className="nb-dash-aviso-text">
        {CORTO}{' '}
        <button type="button" className="nb-dash-aviso-mas" aria-expanded={detalle} onClick={() => setDetalle((v) => !v)}>
          {detalle ? 'Menos información' : 'Más información'}
        </button>
      </p>
      {detalle && (
        <p className="nb-dash-aviso-text is-detalle">
          {DETALLE} <Link to="/dashboard/cuenta">Ir a Mi cuenta</Link>
        </p>
      )}
      <div className="nb-dash-aviso-acciones">
        <button type="button" className={`nb-ex-send${guardando ? ' is-busy' : ''}`} disabled={guardando} onClick={() => responder(true)}>
          Aceptar
        </button>
        <button type="button" className="nb-dash-btn-claro" disabled={guardando} onClick={() => responder(false)}>
          Rechazar
        </button>
      </div>
    </aside>
  );
};

export default RegistroEstudiante;
