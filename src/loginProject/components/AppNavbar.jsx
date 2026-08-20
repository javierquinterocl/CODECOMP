import { useAuth } from '../context/AuthContext';
import Avatar from './Avatar';
import { AIIcon, BellIcon, LogoutIcon } from './icons';

const AppNavbar = () => {
  const { user, codigoEstudiante, storedPhotoURL, displayName, isLoggingOut, handleLogout } = useAuth();

  return (
    <header className="fixed left-0 right-0 top-0 z-50 hidden h-16 items-center justify-between border-b border-slate-200 bg-white/80 px-6 shadow-sm backdrop-blur-xl md:flex">
      <span className="font-['Space_Grotesk'] text-2xl font-black bg-gradient-to-r from-blue-700 to-blue-500 bg-clip-text text-transparent">
        CODECOMP
      </span>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 rounded-full border border-blue-100 bg-gradient-to-r from-blue-50 to-violet-50 px-3 py-1.5">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-violet-500">
            <AIIcon />
          </span>
          <span className="font-['Space_Grotesk'] text-sm font-bold text-blue-700">Asistente IA</span>
        </div>
        <button className="flex h-9 w-9 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600">
          <BellIcon />
        </button>
        <div className="flex items-center gap-2">
          <div className="relative rounded-full p-0.5 bg-gradient-to-tr from-blue-700 to-blue-400">
            <Avatar user={user} photoURL={storedPhotoURL} size="sm" />
          </div>
          <div className="hidden lg:flex lg:flex-col">
            <span className="font-['Space_Grotesk'] text-sm font-bold leading-tight text-slate-900">{displayName}</span>
            <span className="font-['Space_Grotesk'] text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Estudiante{codigoEstudiante ? ` / ${codigoEstudiante}` : ''}
            </span>
            <span className="font-['Inter'] text-[10px] text-slate-400">{user?.email}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 font-['Space_Grotesk'] text-xs font-bold text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <LogoutIcon />
          {isLoggingOut ? '...' : 'Salir'}
        </button>
      </div>
    </header>
  );
};

export default AppNavbar;
