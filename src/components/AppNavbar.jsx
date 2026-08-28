import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

/** Avatar cuadrado del dashboard: foto si existe, inicial si no. */
const DashAvatar = ({ user, photoURL }) => {
  const [imgError, setImgError] = useState(false);
  const initial = (user?.displayName || user?.email || '?')[0].toUpperCase();
  const src = photoURL || user?.photoURL || null;

  return (
    <div className="nb-dash-avatar">
      {src && !imgError
        ? <img src={src} alt={user?.displayName || 'Avatar'} onError={() => setImgError(true)} />
        : initial}
    </div>
  );
};

const AppNavbar = () => {
  const { user, codigoEstudiante, storedPhotoURL, displayName, isLoggingOut, handleLogout } = useAuth();

  return (
    <header className="nb-dash-header">
      <span className="nb-dash-brand">CODECOMP</span>

      <div className="nb-dash-headright">
        <div className="nb-dash-streak">
          <span className="nb-dash-streak-icon">🔥</span>
          <div className="nb-dash-usertext">
            <span className="nb-dash-username">5 días</span>
            <span className="nb-dash-userrole">Racha</span>
          </div>
        </div>

        <div className="nb-dash-user">
          <DashAvatar user={user} photoURL={storedPhotoURL} />
          <div className="nb-dash-usertext">
            <span className="nb-dash-username">{displayName}</span>
            <span className="nb-dash-userrole">
              Estudiante{codigoEstudiante ? ` / ${codigoEstudiante}` : ''}
            </span>
          </div>
        </div>

        <button type="button" onClick={handleLogout} disabled={isLoggingOut} className="nb-dash-logout">
          {isLoggingOut ? '...' : 'Salir'}
        </button>
      </div>
    </header>
  );
};

export default AppNavbar;
