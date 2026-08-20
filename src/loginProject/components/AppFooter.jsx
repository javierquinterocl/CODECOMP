const AppFooter = () => (
  <footer className="ml-0 border-t border-slate-200 bg-white md:ml-64">
    <div className="mx-auto max-w-6xl px-8 py-6">
      <div className="flex flex-col items-center justify-between gap-4 md:flex-row">

        <div className="flex items-center gap-3">
          <img src="/vite.svg" alt="CODECOMP" className="h-7 w-7 opacity-80" />
          <div>
            <p className="font-['Space_Grotesk'] text-sm font-black text-slate-800">CODECOMP</p>
            <p className="font-['Inter'] text-[11px] text-slate-400">Prototipo · 2026</p>
          </div>
        </div>

        <p className="text-center font-['Inter'] text-xs text-slate-400">
          Plataforma de programación competitiva con retroalimentación para la{' '}
          <span className="font-semibold text-slate-500">Universidad Francisco de Paula de Santander</span>
        </p>

      </div>
    </div>
  </footer>
);

export default AppFooter;
