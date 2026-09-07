import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { HomeIcon, CpuIcon, TargetIcon, TrophyIcon, UsersIcon } from './AppIcons';

/* Cada entrada repite el icono de su módulo en el tablero. */
const NavItem = ({ label, to, icono, end = false }) => (
  <NavLink
    to={to}
    end={end}
    className={({ isActive }) => `nb-dash-navitem${isActive ? ' is-active' : ''}`}
  >
    <span className="nb-dash-navicon" aria-hidden="true">{icono}</span>
    {label}
  </NavLink>
);

/**
 * Ítem sin ruta todavía. Va como <span> a propósito: un NavLink con to="#"
 * resuelve a la ruta actual y se marca como activo.
 */
const NavItemSoon = ({ label, icono }) => (
  <span className="nb-dash-navitem is-soon" aria-disabled="true">
    <span className="nb-dash-navicon" aria-hidden="true">{icono}</span>
    {label}
    <span className="nb-dash-soon">Pronto</span>
  </span>
);

const AppSidebar = () => {
  const { isAdmin } = useAuth();

  return (
    <nav className="nb-dash-side">
      <div className="nb-dash-side-head">
        Programa Ingenieria de Sistemas UFPSO
      </div>

      <div className="nb-dash-nav">
        <NavItem label="Inicio" to="/dashboard" icono={<HomeIcon />} end />
        <NavItem label="Problemas" to="/dashboard/problemas" icono={<CpuIcon />} />
        <NavItem label="Retos Diarios" to="/dashboard/retos" icono={<TargetIcon />} />
        <NavItemSoon label="Rankings" icono={<TrophyIcon />} />
        {/* Estudiantes queda restringido a administradores, como estaba antes */}
        {isAdmin && <NavItem label="Estudiantes" to="/historial-usuarios" icono={<UsersIcon />} />}
      </div>

      <div className="nb-dash-side-foot">
        {/* Sin página de tutorial todavía; cuando exista, cambiar por
            <NavLink to="/dashboard/tutorial" className="nb-dash-tutorial"> */}
        <span className="nb-dash-tutorial is-soon" aria-disabled="true">Tutorial</span>
      </div>
    </nav>
  );
};

export default AppSidebar;
