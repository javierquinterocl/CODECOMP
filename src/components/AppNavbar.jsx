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


const ESTRELLA = 'M0 -10 L2.47 -3.4 L9.51 -3.09 L3.99 1.3 L5.88 8.09 L0 4.2 L-5.88 8.09 L-3.99 1.3 L-9.51 -3.09 L-2.47 -3.4 Z';

const BrandCat = () => (
  <span className="nb-dash-brand-cat" aria-hidden="true">
    <img src="/cat-pixel.png" alt="" />
    <svg className="nb-dash-brand-stars" viewBox="0 0 100 100">
      <g fill="#FFD100">
        <path d={ESTRELLA} transform="translate(13 21) scale(0.78)" />
        <path d={ESTRELLA} transform="translate(89 31) scale(0.5)" />
        <path d={ESTRELLA} transform="translate(80 84) scale(0.62)" />
      </g>
    </svg>
  </span>
);

const AppNavbar = () => {
  const { user, codigoEstudiante, storedPhotoURL, displayName, isLoggingOut, handleLogout } = useAuth();

  return (
    <header className="nb-dash-header">
      <div className="nb-dash-brandwrap">
        <span className="nb-dash-brand">CODECOMP</span>
        <BrandCat />
      </div>

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
