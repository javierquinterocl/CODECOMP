import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { BellIcon } from './AppIcons';
import { getAvisos, marcarLeidas, textoDeAviso } from '../scripts/avisos';

const CADA_MS = 5 * 60_000;

/** Campana de la cabecera: avisos guardados en la cuenta, con contador de no leídos. */
const CampanaAvisos = ({ user }) => {
  const [estado, setEstado] = useState({ notificaciones: [], sin_leer: 0 });
  const [abierto, setAbierto] = useState(false);
  const cajaRef = useRef(null);

  const cargar = useCallback(() => {
    // Con la pestaña oculta no se pide nada: se recarga al volver.
    if (!user || document.hidden) return;
    getAvisos(user).then(setEstado).catch(() => {});
  }, [user]);

  useEffect(() => {
    if (!user) return undefined;
    cargar();
    const intervalo = setInterval(cargar, CADA_MS);
    // Tras un envío (racha, escalón o un problema resuelto) se vuelve a pedir.
    window.addEventListener('codecomp:progreso', cargar);
    document.addEventListener('visibilitychange', cargar);
    return () => {
      clearInterval(intervalo);
      window.removeEventListener('codecomp:progreso', cargar);
      document.removeEventListener('visibilitychange', cargar);
    };
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

  const visibles = estado.notificaciones.map((a) => ({ ...a, ...textoDeAviso(a) })).filter((a) => a.titulo);
  const sinLeer = estado.sin_leer;

  // Se marca al instante en pantalla; el servidor confirma con la lista actualizada.
  const leer = (ids) => {
    const marcar = ids === 'todas' ? () => true : (a) => ids.includes(a.id);
    setEstado((e) => ({
      notificaciones: e.notificaciones.map((a) => (marcar(a) ? { ...a, leida: true } : a)),
      sin_leer: ids === 'todas' ? 0 : Math.max(0, e.sin_leer - e.notificaciones.filter((a) => !a.leida && marcar(a)).length),
    }));
    marcarLeidas(user, ids).then(setEstado).catch(() => {});
  };

  return (
    <div className="nb-dash-notif" ref={cajaRef}>
      <button
        type="button"
        className={`nb-dash-notif-btn${abierto ? ' is-open' : ''}`}
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        aria-label={sinLeer ? `Avisos: ${sinLeer} sin leer` : 'Avisos'}
        title="Avisos"
      >
        <BellIcon />
        {sinLeer > 0 && <span className="nb-dash-notif-cuenta">{sinLeer > 9 ? '9+' : sinLeer}</span>}
      </button>

      {abierto && (
        <div className="nb-dash-notif-panel" role="dialog" aria-label="Avisos">
          <div className="nb-dash-notif-head">
            <span className="nb-dash-kicker is-ink">Avisos</span>
            {sinLeer > 0 && (
              <button type="button" className="nb-dash-aviso-mas" onClick={() => leer('todas')}>Marcar todo como leído</button>
            )}
          </div>
          {visibles.length ? (
            <ul className="nb-dash-notif-lista">
              {visibles.map((a) => (
                <li key={a.id} className={a.leida ? '' : 'is-nuevo'}>
                  <Link to={a.enlace} onClick={() => { if (!a.leida) leer([a.id]); setAbierto(false); }}>
                    <strong>{a.titulo}</strong>
                    {a.texto && <small>{a.texto}</small>}
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
