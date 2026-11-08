import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getDatos, responderDatos } from '../scripts/registroApi';
import useActividad from '../scripts/useActividad';

// Texto borrador: lo aprueba el equipo antes de producción.
const AVISO = 'Para que tú y tu docente sepan cómo avanzas, CODECOMP guarda el tiempo que pasas activo en la plataforma, cuándo abres cada problema y cuántas veces pegas código en el editor (solo cuántos caracteres, nunca lo que pegas). Tus envíos y las pistas del tutor se guardan siempre, porque son parte del servicio. Usamos estos datos solo con fines académicos en la UFPS Ocaña, según la Ley 1581 de 2012, y guardamos tu actividad por 12 meses. Puedes retirar tu autorización cuando quieras y borraremos tu actividad.';

/** Pide la autorización de datos una sola vez y, si la hay, registra la actividad. */
const RegistroEstudiante = () => {
  const { user } = useAuth();
  // undefined: cargando o sin sesión; null: aún no responde.
  const [autorizado, setAutorizado] = useState(undefined);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!user) return undefined;
    let vigente = true;
    getDatos(user)
      .then((data) => { if (vigente) setAutorizado(data.autorizado); })
      .catch(() => {});
    return () => { vigente = false; };
  }, [user]);

  useActividad(user, autorizado === true);

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
    <aside className="nb-dash-card nb-dash-pad nb-dash-aviso" role="dialog" aria-labelledby="nb-aviso-titulo">
      <div className="nb-dash-kicker">Tus datos</div>
      <h2 id="nb-aviso-titulo" className="nb-dash-section-title">¿Nos dejas registrar tu actividad?</h2>
      <p className="nb-dash-aviso-text">{AVISO}</p>
      <div className="nb-dash-aviso-acciones">
        <button type="button" className={`nb-ex-send${guardando ? ' is-busy' : ''}`} disabled={guardando} onClick={() => responder(true)}>
          Acepto
        </button>
        <button type="button" className="nb-dash-btn-claro" disabled={guardando} onClick={() => responder(false)}>
          No acepto
        </button>
      </div>
    </aside>
  );
};

export default RegistroEstudiante;
