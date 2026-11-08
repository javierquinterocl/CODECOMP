import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { BellIcon } from './AppIcons';
import { avisoDeEscalon, getAvisos, leidosDe, marcarLeidos, textoDeAviso, verEscalon } from '../scripts/avisos';

const CADA_MS = 5 * 60_000;

/** Campana de la cabecera: avisos del estudiante o del docente, con contador de no leídos. */
const CampanaAvisos = ({ user }) => {
  const [avisos, setAvisos] = useState([]);
  // Los leídos viven en localStorage; aquí se guarda la última lectura junto con su usuario.
  const [marcados, setMarcados] = useState({ uid: null, ids: new Set() });
  const leidos = !user ? new Set() : marcados.uid === user.uid ? marcados.ids : leidosDe(user.uid);
  const [abierto, setAbierto] = useState(false);
  const cajaRef = useRef(null);

  const cargar = useCallback(() => {
    if (!user) return;
    getAvisos(user)
      .then(({ notificaciones, escalon }) => {
        const deEscalon = avisoDeEscalon(user.uid, escalon);
        setAvisos(deEscalon ? [deEscalon, ...notificaciones] : notificaciones);
      })
      .catch(() => {});
  }, [user]);

  useEffect(() => {
    if (!user) return undefined;
    cargar();
    const intervalo = setInterval(cargar, CADA_MS);
    // Tras un envío (racha, escalón o un problema resuelto) se vuelve a pedir.
    window.addEventListener('codecomp:progreso', cargar);
    return () => { clearInterval(intervalo); window.removeEventListener('codecomp:progreso', cargar); };
  }, [user, cargar]);

  // Clic fuera o Escape: cerrar.
  useEffect(() => {
    if (!abierto) return undefined;
    const fuera = (e) => { if (!cajaRef.current?.contains(e.target)) setAbierto(false); };
    const escape = (e) => { if (e.key === 'Escape') setAbierto(false); };
    document.addEventListener('mousedown', fuera);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('mousedown', fuera); document.removeEventListener('keydown', escape); };
  }, [abierto]);

  if (!user) return null;

  const visibles = avisos.map((a) => ({ ...a, ...textoDeAviso(a) })).filter((a) => a.titulo);
  const sinLeer = visibles.filter((a) => !leidos.has(a.id));

  const leer = (lista) => {
    marcarLeidos(user.uid, lista.map((a) => a.id));
    const escalon = lista.find((a) => a.tipo === 'escalon');
    if (escalon) verEscalon(user.uid, escalon.datos.escalon);
    setMarcados({ uid: user.uid, ids: leidosDe(user.uid) });
  };

  return (
    <div className="nb-dash-notif" ref={cajaRef}>
      <button
        type="button"
        className={`nb-dash-notif-btn${abierto ? ' is-open' : ''}`}
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        aria-label={sinLeer.length ? `Avisos: ${sinLeer.length} sin leer` : 'Avisos'}
        title="Avisos"
      >
        <BellIcon />
        {sinLeer.length > 0 && <span className="nb-dash-notif-cuenta">{sinLeer.length > 9 ? '9+' : sinLeer.length}</span>}
      </button>

      {abierto && (
        <div className="nb-dash-notif-panel" role="dialog" aria-label="Avisos">
          <div className="nb-dash-notif-head">
            <span className="nb-dash-kicker is-ink">Avisos</span>
            {sinLeer.length > 0 && (
              <button type="button" className="nb-dash-aviso-mas" onClick={() => leer(sinLeer)}>Marcar todo como leído</button>
            )}
          </div>
          {visibles.length ? (
            <ul className="nb-dash-notif-lista">
              {visibles.map((a) => (
                <li key={a.id} className={leidos.has(a.id) ? '' : 'is-nuevo'}>
                  <Link to={a.enlace} onClick={() => { leer([a]); setAbierto(false); }}>
                    <strong>{a.titulo}</strong>
                    <small>{a.texto}</small>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="nb-doc-vacio nb-dash-notif-vacio">No tienes avisos por ahora.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default CampanaAvisos;
