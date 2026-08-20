import { useAuth } from './context/AuthContext';
import Avatar from './components/Avatar';

const DashboardPage = () => {
  const { user, displayName, firstName, codigoEstudiante, storedPhotoURL, handleLogout, isLoggingOut } = useAuth();

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches';

  return (
    <div className="mx-auto max-w-6xl">

      {/* Welcome header */}
      <header className="mb-8 flex flex-col gap-2">
        <h1 className="font-['Space_Grotesk'] text-4xl font-bold tracking-tight text-slate-900">
          Bienvenido de nuevo,{' '}
          <span className="bg-gradient-to-r from-blue-700 to-blue-500 bg-clip-text text-transparent">
            {firstName}
          </span>
          !
        </h1>
        <p className="max-w-2xl font-['Inter'] text-lg text-slate-600">
          ¿Listo para los algoritmos de hoy? Sigue explorando y mejorando tus habilidades en código.
        </p>
      </header>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-12">

        {/* ── User Profile Card (4 cols) ── */}
        <div className="relative col-span-1 flex flex-col items-center justify-center gap-4 overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-[0_20px_50px_rgba(15,23,42,0.06)] transition-all duration-300 hover:shadow-[0_20px_40px_rgba(0,82,255,0.08)] md:col-span-4">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-blue-500/5 to-transparent" />

          <div className="relative rounded-full p-1 bg-gradient-to-tr from-blue-700 to-blue-400">
            <Avatar user={user} photoURL={storedPhotoURL} size="lg" />
          </div>

          <div>
            <h3 className="font-['Space_Grotesk'] text-2xl font-bold text-slate-900">{displayName}</h3>
            <p className="mt-1 font-['Space_Grotesk'] text-xs font-bold uppercase tracking-wider text-blue-700">
              Estudiante
            </p>
            <p className="mt-1 font-['Inter'] text-xs text-slate-400">{user?.email}</p>
          </div>

          <div className="flex w-full justify-center gap-8 border-t border-slate-200 pt-4">
            {/* Puntos con tooltip */}
            <div className="group relative text-center">
              <div className="flex items-center justify-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-400" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
                <span className="font-['Space_Grotesk'] text-2xl font-bold text-slate-900">0</span>
              </div>
              <span className="font-['Space_Grotesk'] text-xs font-bold uppercase tracking-wider text-slate-500">Puntos</span>

              {/* Tooltip */}
              <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-3 w-56 -translate-x-1/2 scale-95 rounded-xl border border-amber-100 bg-white p-3 text-left opacity-0 shadow-[0_8px_24px_rgba(217,119,6,0.12)] transition-all duration-200 group-hover:scale-100 group-hover:opacity-100">
                <div className="mb-1.5 flex items-center gap-1.5">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-amber-400" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                  <span className="font-['Space_Grotesk'] text-xs font-bold text-amber-700">¿Cómo obtenerlos?</span>
                </div>
                <p className="font-['Inter'] text-xs leading-relaxed text-slate-600">
                  Los puntos se obtienen resolviendo ejercicios del módulo de Problemas. Cada problema resuelto suma puntos a tu perfil.
                </p>
                <div className="absolute -bottom-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-b border-r border-amber-100 bg-white" />
              </div>
            </div>

            <div className="w-px bg-slate-200" />

            {/* Trofeos con tooltip */}
            <div className="group relative text-center">
              <div className="flex items-center justify-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-violet-500" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94A5.01 5.01 0 0011 15.9V18H9v2h6v-2h-2v-2.1a5.01 5.01 0 003.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z" />
                </svg>
                <span className="font-['Space_Grotesk'] text-2xl font-bold text-slate-900">0</span>
              </div>
              <span className="font-['Space_Grotesk'] text-xs font-bold uppercase tracking-wider text-slate-500">Trofeos</span>

              {/* Tooltip */}
              <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-3 w-56 -translate-x-1/2 scale-95 rounded-xl border border-violet-100 bg-white p-3 text-left opacity-0 shadow-[0_8px_24px_rgba(109,40,217,0.12)] transition-all duration-200 group-hover:scale-100 group-hover:opacity-100">
                <div className="mb-1.5 flex items-center gap-1.5">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-violet-500" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94A5.01 5.01 0 0011 15.9V18H9v2h6v-2h-2v-2.1a5.01 5.01 0 003.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z" />
                  </svg>
                  <span className="font-['Space_Grotesk'] text-xs font-bold text-violet-700">¿Cómo obtenerlo?</span>
                </div>
                <p className="font-['Inter'] text-xs leading-relaxed text-slate-600">
                  Este trofeo se otorga al permanecer al menos un semestre en el grupo estable de la maratón de programación de la UFPSO.
                </p>
                {/* Arrow */}
                <div className="absolute -bottom-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-b border-r border-violet-100 bg-white" />
              </div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 font-['Space_Grotesk'] text-sm font-semibold text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            {isLoggingOut ? 'Cerrando sesión...' : 'Cerrar sesión'}
          </button>
        </div>

        {/* ── Continúa Aprendiendo (8 cols) ── */}
        <div className="relative col-span-1 flex flex-col gap-6 overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_20px_50px_rgba(15,23,42,0.06)] transition-all duration-300 hover:shadow-[0_20px_40px_rgba(0,82,255,0.08)] md:col-span-8 md:flex-row md:items-center">
          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-blue-500/10 blur-[60px]" />

          <div className="z-10 flex flex-1 flex-col gap-4">
            <div className="flex items-center gap-2 font-['Space_Grotesk'] text-xs font-bold uppercase tracking-wider text-blue-600">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
              En progreso
            </div>

            <h2 className="font-['Space_Grotesk'] text-3xl font-bold leading-tight tracking-tight text-slate-900">
              React Hooks: Patrones Avanzados
            </h2>

            <p className="font-['Inter'] text-base text-slate-600">
              Domina el manejo de estado, efectos y memoización con los hooks modernos de React. Estás al 60% de este módulo.
            </p>

            <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-blue-700 to-blue-500"
                style={{ width: '60%' }}
              />
            </div>

          </div>

          {/* Code snippet decoration */}
          <div className="z-10 hidden h-44 w-44 shrink-0 overflow-hidden rounded-xl border border-slate-700 bg-slate-900 p-4 font-mono text-xs leading-relaxed text-slate-400 md:flex md:flex-col">
            <span className="text-blue-400">const</span>{' '}
            <span className="text-emerald-400">useData</span>{' '}
            <span className="text-white">= () =&gt; {'{'}</span>
            <br />
            <span>{'  '}const [data,</span>
            <br />
            <span>{'    '}setData]</span>
            <br />
            <span>{'  '}= <span className="text-blue-400">useState</span>(</span>
            <span className="text-orange-400">null</span>
            <span>);</span>
            <br />
            <span>{'  '}...</span>
            <br />
            <span className="text-white">{'}'}</span>
          </div>
        </div>

        {/* ── Módulos: Problemas + Competencias (6 cols, apilados) ── */}
        <div className="col-span-1 flex flex-col gap-4 md:col-span-6">

          {/* Problemas — activo */}
          <div className="group flex flex-1 cursor-pointer items-center gap-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_20px_50px_rgba(15,23,42,0.06)] transition-all duration-300 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-[0_20px_40px_rgba(0,82,255,0.08)]">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 transition-colors group-hover:bg-blue-100">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="font-['Space_Grotesk'] text-xs font-bold uppercase tracking-wider text-blue-600">Módulo</p>
              <h3 className="mt-1 font-['Space_Grotesk'] text-lg font-bold text-slate-900">Problemas</h3>
              <p className="mt-1 font-['Inter'] text-sm text-slate-600">
                Explora nuestro repositorio de problemas para prepararte en la programacion competitiva.
              </p>
            </div>
            <div className="shrink-0 text-blue-500 transition-transform duration-200 group-hover:translate-x-1">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 17L17 7M17 7H7M17 7v10" />
              </svg>
            </div>
          </div>

          {/* Competencias — desactivado */}
          <div className="relative flex flex-1 items-center gap-5 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-5 shadow-[0_4px_20px_rgba(15,23,42,0.04)]">
            <div className="absolute right-4 top-4 flex items-center gap-1 rounded-full bg-slate-200 px-2.5 py-1 font-['Space_Grotesk'] text-[10px] font-bold uppercase tracking-wider text-slate-500">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
              </svg>
              Próximamente
            </div>

            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-300">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0" />
              </svg>
            </div>

            <div className="flex-1 pr-20">
              <p className="font-['Space_Grotesk'] text-xs font-bold uppercase tracking-wider text-slate-400">Módulo</p>
              <h3 className="mt-1 font-['Space_Grotesk'] text-lg font-bold text-slate-400">Competencias</h3>
              <p className="mt-1 font-['Inter'] text-sm text-slate-400">
                Este módulo se activa en la feria de proyectos de la UFPSO.
              </p>
            </div>
          </div>

        </div>

        {/* ── Asistente IA (6 cols) ── */}
        <div className="col-span-1 flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_20px_50px_rgba(15,23,42,0.06)] md:col-span-6">

          {/* Saludo centrado */}
          <div className="mb-5 text-center">
            <p className="font-['Inter'] text-sm text-slate-400">{greeting}, {firstName}</p>
            <h3 className="mt-2 font-['Space_Grotesk'] text-2xl font-bold leading-snug text-slate-900">
              ¿En qué puedo asistirte hoy?
            </h3>
          </div>

          {/* Tiles de acción */}
          <div className="flex flex-1 grid-cols-3 flex-col gap-3 sm:grid">
            {[
              {
                icon: (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                ),
                title: 'Explicar concepto',
                desc: 'Obtén explicaciones claras de algoritmos y estructuras de datos.',
              },
              {
                icon: (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                ),
                title: 'Revisar mi código',
                desc: 'Pega tu solución y recibe retroalimentación detallada al instante.',
              },
              {
                icon: (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                ),
                title: 'Sugerir ejercicios',
                desc: 'Recibe recomendaciones personalizadas según tu nivel actual.',
              },
            ].map(({ icon, title, desc }) => (
              <button
                key={title}
                className="flex flex-col gap-2 rounded-xl border border-slate-100 bg-slate-50 p-4 text-left transition hover:border-slate-200 hover:bg-slate-100"
              >
                {icon}
                <span className="font-['Space_Grotesk'] text-sm font-bold text-slate-800">{title}</span>
                <span className="font-['Inter'] text-xs leading-relaxed text-slate-500">{desc}</span>
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="mt-4 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 transition focus-within:border-blue-400 focus-within:bg-white">
            <input
              type="text"
              placeholder="Escribe tu pregunta..."
              className="flex-1 bg-transparent font-['Inter'] text-sm text-slate-700 outline-none placeholder:text-slate-400"
            />
            <button className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-700 to-blue-500 text-white transition hover:brightness-110">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            </button>
          </div>
        </div>

        {/* ── Calendario RPC 2026 (6 cols) ── */}
        <div className="col-span-1 flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_20px_50px_rgba(15,23,42,0.06)] md:col-span-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h3 className="font-['Space_Grotesk'] text-xl font-bold text-slate-900">Competencias RPC 2026</h3>
              <p className="mt-0.5 font-['Inter'] text-xs text-slate-400">Red de Programación Competitiva</p>
            </div>
            <a
              href="https://www.facebook.com/RedProgramacionCompetitiva"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 font-['Space_Grotesk'] text-xs font-semibold text-slate-500 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Ver RPC
            </a>
          </div>

          <div className="flex flex-col gap-3">
            {/* RPC 03 */}
            <div className="flex gap-4 rounded-xl border border-slate-100 bg-slate-50 p-4">
              <div className="flex w-14 shrink-0 flex-col items-center justify-center rounded-lg bg-blue-600 py-2 text-white">
                <span className="font-['Space_Grotesk'] text-[10px] font-bold uppercase tracking-wider opacity-80">Abr</span>
                <span className="font-['Space_Grotesk'] text-2xl font-black leading-none">11</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="mb-1 flex items-center gap-2">
                  <span className="font-['Space_Grotesk'] text-sm font-bold text-slate-900">Competencia 03 RPC 2026</span>
                  <span className="shrink-0 rounded-full bg-slate-200 px-2 py-0.5 font-['Space_Grotesk'] text-[10px] font-bold uppercase tracking-wider text-slate-500">Finalizado</span>
                </div>
                <p className="font-['Inter'] text-xs text-slate-500">Sáb 11 de abril · 13:00 UTC-5 · 5 horas</p>
                <p className="mt-1 font-['Inter'] text-xs text-slate-400">~12 retos de todos los niveles para equipos latinos clasificatorios.</p>
              </div>
            </div>

            {/* RPC 02 */}
            <div className="flex gap-4 rounded-xl border border-slate-100 bg-slate-50 p-4">
              <div className="flex w-14 shrink-0 flex-col items-center justify-center rounded-lg bg-slate-400 py-2 text-white">
                <span className="font-['Space_Grotesk'] text-[10px] font-bold uppercase tracking-wider opacity-80">Mar</span>
                <span className="font-['Space_Grotesk'] text-2xl font-black leading-none">14</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="mb-1 flex items-center gap-2">
                  <span className="font-['Space_Grotesk'] text-sm font-bold text-slate-900">Competencia 02 RPC 2026</span>
                  <span className="shrink-0 rounded-full bg-slate-200 px-2 py-0.5 font-['Space_Grotesk'] text-[10px] font-bold uppercase tracking-wider text-slate-500">Finalizado</span>
                </div>
                <p className="font-['Inter'] text-xs text-slate-500">Sáb 14 de marzo · 13:00 UTC-5 · 5 horas</p>
                <p className="mt-1 font-['Inter'] text-xs text-slate-400">Maratón con ~12 retos para continuar el ciclo de entrenamiento latino.</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Leaderboard Grupo Estable (6 cols) ── */}
        <div className="col-span-1 flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_20px_50px_rgba(15,23,42,0.06)] md:col-span-6">
          <div className="mb-5">
            <h3 className="font-['Space_Grotesk'] text-xl font-bold text-slate-900">Grupo Estable</h3>
            <p className="mt-0.5 font-['Inter'] text-xs text-slate-400">Maratón de Programación · UFPSO</p>
          </div>

          <div className="flex flex-col gap-2">
            {[
              { name: 'Javier Quintero',   code: '192163', pts: 0 },
              { name: 'Andres Salas',     code: '192164', pts: 0 },
              { name: 'Andrey Castilla',     code: '1021634', pts: 0 },
              { name: 'Laura Aura',     code: '1021592', pts: 0 },
              { name: 'Ivan Cepeda',    code: '1021718', pts: 0 },
            ].map((player, i) => {
              const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null;
              const isTop = i < 3;
              const isCurrentUser = player.code === codigoEstudiante;
              return (
                <div
                  key={player.code}
                  className={`flex items-center gap-3 rounded-xl px-4 py-3 transition ${
                    isCurrentUser
                      ? 'border border-blue-200 bg-blue-50'
                      : isTop
                      ? 'bg-slate-50'
                      : ''
                  }`}
                >
                  <span className="w-6 text-center font-['Space_Grotesk'] text-sm font-bold text-slate-400">
                    {medal ?? <span className="text-slate-300">{i + 1}</span>}
                  </span>
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-blue-400 font-['Space_Grotesk'] text-sm font-bold text-white">
                    {player.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`truncate font-['Space_Grotesk'] text-sm font-bold ${isCurrentUser ? 'text-blue-700' : 'text-slate-800'}`}>
                      {player.name} {isCurrentUser && <span className="text-[10px] font-normal">(tú)</span>}
                    </p>
                    <p className="font-['Inter'] text-xs text-slate-400">{player.code}</p>
                  </div>
                  <span className="font-['Space_Grotesk'] text-sm font-bold text-slate-500">
                    {player.pts} <span className="text-xs font-normal text-slate-400">pts</span>
                  </span>
                </div>
              );
            })}
          </div>


        </div>

      </div>
    </div>
  );
};

export default DashboardPage;
