import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NavItem = ({ label, to, end = false }) => (
  <NavLink
    to={to}
    end={end}
    className={({ isActive }) => `nb-dash-navitem${isActive ? ' is-active' : ''}`}
  >
    {label}
  </NavLink>
);

/**
 * Ítem sin ruta todavía. Va como <span> a propósito: un NavLink con to="#"
 * resuelve a la ruta actual y se marca como activo.
 */
const NavItemSoon = ({ label }) => (
  <span className="nb-dash-navitem is-soon" aria-disabled="true">
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
        <NavItem label="Inicio" to="/dashboard" end />
        <NavItem label="Retos Diarios" to="/dashboard/retos" />
        <NavItemSoon label="Rankings" />
        {/* Estudiantes queda restringido a administradores, como estaba antes */}
        {isAdmin && <NavItem label="Estudiantes" to="/historial-usuarios" />}
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
