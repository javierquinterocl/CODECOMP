import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { HomeIcon, BookIcon, CpuIcon, TargetIcon, TrophyIcon, UsersIcon, CollapseIcon, ExpandIcon } from './AppIcons';

/* Cada entrada repite el icono de su módulo en el tablero. El `title` deja
   identificar la entrada cuando el sidebar está plegado a solo iconos. */
const NavItem = ({ label, to, icono, end = false }) => (
  <NavLink
    to={to}
    end={end}
    title={label}
    className={({ isActive }) => `nb-dash-navitem${isActive ? ' is-active' : ''}`}
  >
    <span className="nb-dash-navicon" aria-hidden="true">{icono}</span>
    <span className="nb-dash-navlabel">{label}</span>
  </NavLink>
);

/**
 * Ítem sin ruta todavía. Va como <span> a propósito: un NavLink con to="#"
 * resuelve a la ruta actual y se marca como activo.
 */
const NavItemSoon = ({ label, icono }) => (
  <span className="nb-dash-navitem is-soon" aria-disabled="true" title={`${label} (pronto)`}>
    <span className="nb-dash-navicon" aria-hidden="true">{icono}</span>
    <span className="nb-dash-navlabel">{label}</span>
    <span className="nb-dash-soon">Pronto</span>
  </span>
);

/* Vistas de resolver un ejercicio: ahí el sidebar cede el ancho al editor. */
const ES_EJERCICIO = /^\/dashboard\/(?:problemas\/[^/]+\/[^/]+|fundamentos\/[^/]+\/[^/]+)\/?$/;

const AppSidebar = () => {
  const { isAdmin } = useAuth();
  const { pathname } = useLocation();
  const enEjercicio = ES_EJERCICIO.test(pathname);

  // Se guarda con la ruta para que la elección manual no se herede al
  // siguiente ejercicio: cada uno vuelve a abrir plegado.
  const [abiertoEn, setAbiertoEn] = useState(null);
  const plegado = enEjercicio && abiertoEn !== pathname;

  return (
    <nav className={`nb-dash-side${plegado ? ' is-collapsed' : ''}`}>
      <div className="nb-dash-side-head">
        Programa Ingenieria de Sistemas UFPSO
      </div>

      {enEjercicio && (
        <button
          type="button"
          className="nb-dash-side-toggle"
          onClick={() => setAbiertoEn(plegado ? pathname : null)}
          aria-expanded={!plegado}
          title={plegado ? 'Expandir el menú' : 'Plegar el menú'}
          aria-label={plegado ? 'Expandir el menú' : 'Plegar el menú'}
        >
          {plegado ? <ExpandIcon /> : <CollapseIcon />}
          <span className="nb-dash-navlabel">Plegar menú</span>
        </button>
      )}

      <div className="nb-dash-nav">
        <NavItem label="Inicio" to="/dashboard" icono={<HomeIcon />} end />
        <NavItem label="Fundamentos" to="/dashboard/fundamentos" icono={<BookIcon />} />
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
