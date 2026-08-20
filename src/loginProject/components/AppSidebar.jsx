import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { HomeIcon, TrophyIcon, TournamentIcon, GruposIcon, LeaderboardIcon, HistoryIcon, SettingsIcon } from './icons';

const NavItem = ({ icon, label, to, end = false }) => (
  <NavLink
    to={to}
    end={end}
    className={({ isActive }) =>
      isActive
        ? "flex items-center gap-3 rounded-lg border-r-4 border-blue-600 bg-blue-50 px-4 py-3 font-['Space_Grotesk'] text-sm font-bold text-blue-700"
        : "flex items-center gap-3 rounded-lg px-4 py-3 font-['Space_Grotesk'] text-sm font-semibold text-slate-500 transition-all duration-200 hover:translate-x-1 hover:bg-slate-50 hover:text-slate-900"
    }
  >
    {icon}
    {label}
  </NavLink>
);

const AppSidebar = () => {
  const { isAdmin } = useAuth();

  return (
    <nav className="fixed left-0 top-0 z-40 hidden h-full w-64 flex-col border-r border-slate-200 bg-white/80 px-4 pb-8 pt-24 shadow-xl backdrop-blur-xl md:flex">
      <div className="mb-6 flex items-center gap-3 px-2">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg shadow-lg">
          <img src="/vite.svg" alt="CODECOMP logo" className="h-full w-full object-contain" />
        </div>
        <div>
          <h2 className="font-['Space_Grotesk'] text-lg font-bold text-slate-900">CODECOMP</h2>
          <p className="font-['Space_Grotesk'] text-[10px] font-bold uppercase tracking-wider text-slate-500">Programa Ingenieria de Sistemas UFPSO</p>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-1">
        <NavItem icon={<HomeIcon />} label="Inicio" to="/dashboard" end />
        <NavItem icon={<TrophyIcon />} label="Retos Diarios" to="/dashboard/retos" />
        <NavItem icon={<TournamentIcon />} label="Torneos" to="/dashboard/torneos" />
        <NavItem icon={<GruposIcon />} label="Grupos" to="/dashboard/grupos" />
        <NavItem icon={<LeaderboardIcon />} label="Rankings" to="#" />
        {isAdmin && <NavItem icon={<HistoryIcon />} label="Usuarios" to="/historial-usuarios" />}
      </div>

      <NavItem icon={<SettingsIcon />} label="Configuración" to="/reset" />
    </nav>
  );
};

export default AppSidebar;
