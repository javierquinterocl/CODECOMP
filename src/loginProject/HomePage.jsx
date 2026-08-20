import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const useTyper = (text, speed = 90, startDelay = 800) => {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    let i = 0;
    setDisplayed('');
    setDone(false);
    const timeout = setTimeout(() => {
      const interval = setInterval(() => {
        i += 1;
        setDisplayed(text.slice(0, i));
        if (i >= text.length) {
          clearInterval(interval);
          setDone(true);
        }
      }, speed);
      return () => clearInterval(interval);
    }, startDelay);
    return () => clearTimeout(timeout);
  }, [text, speed, startDelay]);

  return { displayed, done };
};

const GRAD = 'linear-gradient(105deg, #0a6bff 0%, #0040d6 52%, #001f7a 100%)';
const gradText = { background: GRAD, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' };
const liftSm = { boxShadow: '0 1px 2px rgba(19,27,46,0.04), 0 12px 32px -16px rgba(19,27,46,0.12)' };
const lift = { boxShadow: '0 1px 2px rgba(19,27,46,0.04), 0 24px 60px -28px rgba(0,62,199,0.22)' };
const ideShadow = { boxShadow: '0 2px 4px rgba(19,27,46,0.06), 0 50px 110px -30px rgba(0,62,199,0.30)' };
const hairline = { border: '1px solid rgba(19,27,46,0.08)' };
const btnPrimary = {
  background: '#0052ff',
  
};

const GridBg = () => (
  <div
    className="absolute inset-0 pointer-events-none"
    style={{
      backgroundImage:
        'linear-gradient(rgba(15,23,42,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,0.035) 1px, transparent 1px)',
      backgroundSize: '56px 56px',
      WebkitMaskImage: 'radial-gradient(ellipse 80% 60% at 50% 30%, #000 0%, transparent 75%)',
      maskImage: 'radial-gradient(ellipse 80% 60% at 50% 30%, #000 0%, transparent 75%)',
    }}
  />
);

const IDEMockup = () => (
  <div
    className="relative rounded-2xl overflow-hidden text-left"
    style={{ background: '#0a0e1a', ...hairline}}
  >
    <div
      className="flex items-center justify-between px-4 py-3 border-b border-white/[0.07]"
      style={{ background: '#0d1322' }}
    >
      <div className="flex items-center gap-3">
        <div className="flex gap-1.5">
          <span className="w-3 h-3 rounded-full bg-[#ff5f56]" />
          <span className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
          <span className="w-3 h-3 rounded-full bg-[#27c93f]" />
        </div>
        <div className="hidden sm:flex items-center gap-1 ml-3">
          <span
            className="px-3 py-1 rounded-t-md font-mono text-[11px] text-white/80 border-t border-x border-white/10"
            style={{ background: '#0a0e1a' }}
          >
            solution.js
          </span>
          <span className="px-3 py-1 font-mono text-[11px] text-white/35">input.txt</span>
        </div>
      </div>
      <div className="flex items-center gap-3 text-white/30">
        <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l3 3-3 3m5 0h3" />
        </svg>
        <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
        </svg>
      </div>
    </div>

    <div className="flex font-mono text-[13.5px]" style={{ minHeight: '380px' }}>
      <div className="py-4 pr-3 pl-4 text-right text-white/20 select-none border-r border-white/[0.06] leading-[1.7]">
        {Array.from({ length: 12 }, (_, i) => <div key={i}>{i + 1}</div>)}
      </div>

      <div className="flex-1 p-4 overflow-x-auto leading-[1.7] text-white/90">
        <div><span className="text-purple-400">#include</span> <span className="text-green-300">&lt;iostream&gt;</span></div>
        <div><span className="text-purple-400">#include</span> <span className="text-green-300">&lt;vector&gt;</span></div>
        <div><span className="text-purple-400">using namespace</span> <span className="text-white/90"> std</span>;</div>
        <div>&nbsp;</div>
        <div>
          <span className="text-sky-300">int</span>{' '}
          <span className="text-blue-300">solve</span>
          <span className="text-cyan-300">(</span>
          <span className="text-sky-300">vector</span>
          <span className="text-cyan-300">&lt;</span>
          <span className="text-sky-300">int</span>
          <span className="text-cyan-300">&gt;&amp;</span>{' '}
          <span className="text-white/90">nums</span>
          <span className="text-cyan-300">)</span>{' '}
          <span className="text-cyan-300">{'{'}</span>
        </div>
        <div
          className="-mx-4 px-4 border-l-2 border-cyan-400/50"
          style={{ background: 'rgba(76,214,255,0.055)' }}
        >
          <span className="text-slate-500 italic">&nbsp;&nbsp;{'// CodeComp AI: estrategia óptima O(N log N)'}</span>
        </div>
        <div className="ml-4">
          <span className="text-purple-400">for</span>{' '}
          <span className="text-cyan-300">(</span>
          <span className="text-sky-300">int</span>{' '}
          <span className="text-white/90">i</span> ={' '}
          <span className="text-orange-400">0</span>;{' '}
          <span className="text-white/90">i</span> &lt;{' '}
          <span className="text-white/90">nums</span>.
          <span className="text-blue-300">size</span>
          <span className="text-cyan-300">()</span>; ++
          <span className="text-white/90">i</span>
          <span className="text-cyan-300">)</span>{' '}
          <span className="text-cyan-300">{'{'}</span>
        </div>
        <div className="ml-8">
          <span className="text-purple-400">if</span>{' '}
          <span className="text-cyan-300">(</span>
          <span className="text-white/90">nums</span>
          <span className="text-cyan-300">[</span>
          <span className="text-white/90">i</span>
          <span className="text-cyan-300">]</span> &gt;{' '}
          <span className="text-orange-400">0</span>
          <span className="text-cyan-300">)</span>{' '}
          <span className="text-cyan-300">{'{'}</span>
        </div>
        <div className="ml-12">
          <span className="text-blue-300">process_element</span>
          <span className="text-cyan-300">(</span>
          <span className="text-white/90">nums</span>
          <span className="text-cyan-300">[</span>
          <span className="text-white/90">i</span>
          <span className="text-cyan-300">]);</span>
        </div>
        <div className="ml-8"><span className="text-cyan-300">{'}'}</span></div>
        <div className="ml-4"><span className="text-cyan-300">{'}'}</span></div>
        <div className="ml-4"><span className="text-purple-400">return</span> <span className="text-orange-400">0</span>;</div>
        <div><span className="text-cyan-300">{'}'}</span><span className="animate-pulse text-cyan-300/70">▋</span></div>
      </div>

      <div
        className="absolute right-5 top-1/2 -translate-y-1/2 w-64 p-5 rounded-2xl border border-white/10"
        style={{ background: 'rgba(17,23,41,0.92)', backdropFilter: 'blur(12px)' }}
      >
        <div className="flex items-center gap-2 mb-3">
          <span
            className="w-1.5 h-1.5 rounded-full bg-cyan-300"
            
          />
          <span
            className="font-mono text-[10px] uppercase tracking-wider"
            style={{ background: GRAD, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}
          >
            AI Assistant
          </span>
        </div>
        <p className="text-white/80 text-[12.5px] leading-relaxed mb-4">
          Detecté un posible cuello de botella en tu bucle. ¿Aplico la optimización{' '}
          ?
        </p>
        <div className="flex gap-2">
          <button className="flex-1 text-white py-2 rounded-lg text-[12px] font-semibold bg-blue-600">Aplicar</button>
          <button className="px-3 py-2 border border-white/15 rounded-lg text-white/60 text-[12px]">Ignorar</button>
        </div>
      </div>
    </div>
  </div>
);

const TerminalSnippet = ({ filename, lines }) => (
  <div className="rounded-2xl overflow-hidden" style={{ background: '#0a0e1a', ...hairline }}>
    <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/10">
      <div className="flex gap-1.5">
        <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#27c93f]" />
      </div>
      <span className="font-mono text-[10px] text-white/40 ml-1">{filename}</span>
    </div>
    <div className="px-4 py-3.5 font-mono text-[12px] leading-relaxed">
      {lines.map((line, i) => (
        <div key={i} className={i > 0 ? 'mt-1' : ''}>{line}</div>
      ))}
    </div>
  </div>
);

const FAQItem = ({ q, a }) => {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="rounded-2xl overflow-hidden transition-all duration-200 bg-white"
      style={{ ...hairline}}
    >
      <button
        className="w-full flex items-center justify-between gap-4 text-left px-6 py-5"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="font-['Space_Grotesk'] text-[18px] font-semibold text-slate-900">{q}</span>
        <span
          className="grid place-items-center w-8 h-8 rounded-full bg-slate-100 text-blue-700 shrink-0 transition-transform duration-300"
          style={{ transform: open ? 'rotate(45deg)' : 'rotate(0deg)' }}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </span>
      </button>
      <div
        className="overflow-hidden transition-all duration-300 ease-out"
        style={{ maxHeight: open ? '200px' : '0px' }}
      >
        <p className="px-6 pb-5 text-slate-600">{a}</p>
      </div>
    </div>
  );
};

const FAQS = [
  { q: '¿Qué es CodeComp?', a: 'Una plataforma de programación competitiva que agiliza el flujo de trabajo con herramientas de IA e integraciones sin fricción, diseñada para la UFPSO.' },
  { q: '¿CodeComp es gratis?', a: 'Sí, el acceso base es gratuito para todos los estudiantes. Módulos adicionales se activan en eventos como la feria de proyectos.' },
  { q: '¿Qué integraciones tiene?', a: 'Soportamos autenticación con Google, GitHub y Facebook de forma nativa, con historial de sesiones y perfiles de estudiante.' },
  { q: '¿Es seguro?', a: 'Usamos Firebase Auth con múltiples proveedores OAuth y almacenamiento seguro en Firestore con reglas de acceso por usuario.' },
  { q: '¿Qué tan rápida es la IA?', a: 'El asistente IA está diseñado para dar retroalimentación en tiempo real mientras resuelves problemas del módulo de Problemas.' },
  { q: '¿Es multi-lenguaje?', a: 'El módulo de problemas soporta múltiples lenguajes de programación competitiva, incluyendo C++, Python y Java.' },
];

const HomePage = () => {
  const { displayed, done } = useTyper('Potenciada por IA', 120, 800);
  return (
  <div className="bg-[#f8fafc] text-slate-900 overflow-x-hidden selection:bg-blue-200 antialiased">

    <nav
      className="fixed top-0 w-full z-50 backdrop-blur-xl border-b"
      style={{ background: '#f8fafc', borderColor: 'rgba(19,27,46,0.06)' }}
    >
      <div className="flex justify-between items-center max-w-7xl mx-auto px-5 md:px-20 py-4">
        <div className="flex items-center gap-10">
          <Link to="/" className="flex items-center gap-2.5">
            
            <span className="font-['Space_Grotesk'] text-[22px] font-bold tracking-tight text-slate-900">CODECOMP</span>
          </Link>
          <div className="hidden md:flex items-center gap-7 text-[15px] font-medium">
            {['Producto', 'Retos', 'Hooks', 'Recursos'].map((label) => (
              <span key={label} className="text-slate-500 hover:text-slate-900 transition-colors cursor-pointer font-['Space_Grotesk']">{label}</span>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-5">
          <Link
            to="/login"
            className="hidden md:block text-slate-900 font-['Space_Grotesk'] font-medium text-[15px] hover:text-blue-700 transition-colors"
          >
            Iniciar sesión
          </Link>
          <Link
            to="/register"
            className="text-white px-5 py-2.5 rounded-xl font-['Space_Grotesk'] font-medium text-[13px] tracking-wide transition-all hover:-translate-y-0.5"
            style={btnPrimary}
          >
            Registrarse
          </Link>
        </div>
      </div>
    </nav>

    <section className="relative pt-[150px] pb-28 overflow-hidden">
      <GridBg />

      <div className="relative max-w-7xl mx-auto px-5 md:px-20 text-center">

        <div
          className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-white mb-9"
          style={{ ...hairline }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full bg-teal-400"
            
          />
          <span className="font-mono text-slate-500 text-[11px] uppercase tracking-[0.18em]">
            Impulsado por IA de nueva generación
          </span>
        </div>

        <h1
          className="font-['Sans Serif'] font-extrabold text-slate-900 max-w-5xl mx-auto mb-7 leading-[1.04] tracking-[-0.035em]"
          style={{ fontSize: 'clamp(40px,7vw,82px)' }}
        >
          Programación Competitiva{' '}
          <span style={gradText}>
            {displayed}
            <span
              className="inline-block w-[3px] h-[0.85em] align-middle ml-0.5 rounded-sm"
              style={{ background: GRAD, animation: 'blink 1.1s steps(1) infinite' }}
            />
          </span>
        </h1>

        <p className="font-['Inter'] text-[18px] leading-relaxed text-slate-500 max-w-2xl mx-auto mb-10">
          Eficiencia y precisión sin igual gracias a herramientas inteligentes diseñadas para acelerar tu flujo,
          potenciar la creatividad y redefinir tu codigo.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 mb-16">
          <Link
            to="/login"
            className="text-white px-7 py-3.5 rounded-xl font-['Space_Grotesk'] font-semibold text-[15px] flex items-center gap-2 transition-all hover:-translate-y-0.5"
            style={btnPrimary}
          >
            Empieza ahora
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>

        <div className="relative max-w-5xl mx-auto">
          <IDEMockup />
        </div>
      </div>
    </section>

    <section className="relative py-24 overflow-hidden">
      <div className="max-w-7xl mx-auto px-5 md:px-20">
        <div className="flex items-center gap-4 mb-10">
          <span className="font-mono text-[13px] uppercase tracking-[0.18em] text-blue-700">01 — Por qué CODECOMP</span>
          <span className="flex-1 h-px bg-slate-900/10" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div
            className="md:col-span-2 bg-white rounded-3xl p-8 flex flex-col justify-between hover:shadow-lg transition-shadow duration-300"
            style={{ ...hairline }}
          >
            <div>
              <div className="grid place-items-center w-12 h-12 rounded-xl mb-6 text-blue-700" style={{ ...hairline }}>
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="font-['Space_Grotesk'] text-[30px] font-semibold text-slate-900 mb-2 tracking-tight">99.9% de precisión</h3>
              <p className="text-slate-500 max-w-sm font-['Inter']">Modelos afinados con datos de programación competitiva de alta calidad, para una precisión inigualable.</p>
            </div>
            <div className="mt-8 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width: '99.9%', background: GRAD, boxShadow: '0 0 10px rgba(0,82,255,0.5)' }} />
            </div>
          </div>

          <div className="bg-white rounded-3xl p-8 hover:shadow-lg transition-shadow duration-300" style={{ ...hairline}}>
            <div className="grid place-items-center w-12 h-12 rounded-xl bg-white mb-6" style={hairline}>
              <svg className="w-6 h-6 text-blue-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
              </svg>
            </div>
            <div className="font-['Space_Grotesk'] text-[44px] font-bold text-slate-900 leading-none mb-3">UFPSO</div>
            <p className="text-slate-900 font-['Space_Grotesk'] font-semibold mb-1">Estudiantes </p>
            <p className="text-slate-500 text-sm font-['Inter']">Un espacio para estudiantes de programación competitiva.</p>
          </div>

          <div className="bg-white rounded-3xl p-8 hover:shadow-lg transition-shadow duration-300" style={{ ...hairline,  }}>
            <div className="grid place-items-center w-12 h-12 rounded-xl bg-white mb-6" style={hairline}>
              <svg className="w-6 h-6 text-blue-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
              </svg>
            </div>
            <div className="font-['Space_Grotesk'] text-[44px] font-bold text-slate-900 leading-none mb-3">&lt;100ms</div>
            <p className="text-slate-900 font-['Space_Grotesk'] font-semibold mb-1">Latencia de sugerencia</p>
            <p className="text-slate-500 text-sm font-['Inter']">Asistencia en tiempo real que sigue el ritmo de tu escritura.</p>
          </div>

          <div className="md:col-span-4 bg-white rounded-3xl p-8 flex flex-col md:flex-row items-center justify-between gap-8" style={{ ...hairline }}>
            <div className="max-w-md">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-full mb-4">
                <svg className="w-4 h-4 text-blue-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 21l5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 016-.371m0 0c1.12 0 2.233.038 3.334.114M9 5.25V3m3.334 2.364C11.176 10.658 7.69 15.08 3 17.502m9.334-12.138c.896.061 1.785.147 2.666.257m-4.589 8.495a18.023 18.023 0 01-3.827-5.802" />
                </svg>
                <span className="font-mono text-blue-700 text-[11px] uppercase tracking-[0.18em]">Soporte universal</span>
              </div>
              <h3 className="font-['Space_Grotesk'] text-[30px] font-semibold text-slate-900 mb-2 tracking-tight">40+ lenguajes</h3>
              <p className="text-slate-500 font-['Inter']">De C++ y Python a Rust y Haskell: CODECOMP entiende los matices de cada paradigma.</p>
            </div>
            <div className="flex flex-wrap gap-2.5 justify-center md:justify-end">
              {['C++', 'Python', 'Rust', 'Go', 'Java', 'TypeScript'].map((lang) => (
                <span
                  key={lang}
                  className="px-4 py-2 rounded-lg font-mono text-sm text-slate-500"
                  style={{ background: '#f2f3ff', ...hairline }}
                >
                  {lang}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>

    <section className="py-40">
      <div className="max-w-7xl mx-auto px-5 md:px-20">
        <div className="flex items-center gap-4 mb-12">
          <span className="font-mono text-[13px] uppercase tracking-[0.18em] text-blue-700">02 — Herramientas</span>
          <span className="flex-1 h-px bg-slate-900/10" />
        </div>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 gap-8">
          <h2
            className="font-['Space_Grotesk'] font-semibold tracking-tight text-slate-900 max-w-2xl"
            style={{ fontSize: 'clamp(32px,4.4vw,48px)' }}
          >
            Herramientas <span style={gradText}>pensadas para ganar</span>
          </h2>
          <p className="font-['Inter'] text-[18px] leading-relaxed text-slate-500 max-w-md">
            Diseña y lanza algoritmos en pocos clics. Un flujo de trabajo hecho para la creatividad y la eficiencia.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="group p-8 rounded-3xl bg-white hover:shadow-lg transition-all duration-300 flex flex-col" style={hairline}>
            <div className="grid place-items-center w-14 h-14 rounded-2xl mb-7 bg-white" style={hairline}>
              <svg className="w-7 h-7 text-blue-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
            </div>
            <h3 className="font-['Space_Grotesk'] text-[22px] font-semibold text-slate-900 mb-3">Ejecucion segura de Jueza</h3>
            <p className="text-slate-500 mb-6 flex-1 font-['Inter']">Herramientas para optimizar tu código a nivel competitivo.</p>
            <TerminalSnippet filename="auth.sh" lines={[
              <><span className="text-cyan-300">$</span> <span className="text-white/80"> Ejecutando Ejercicio</span> <span className="text-white/60">--rotate</span></>,
              <><span className="text-green-400">✓</span> <span className="text-white/60"> Tiempo de ejecucion: 2.34s</span></>,
              <><span className="text-cyan-300">$</span> <span className="text-green-300"> "Operacion completada"</span></>,
            ]} />
          </div>

          <div className="group p-8 rounded-3xl bg-white hover:shadow-lg transition-all duration-300 flex flex-col" style={hairline}>
            <div className="grid place-items-center w-14 h-14 rounded-2xl mb-7 bg-white" style={hairline}>
              <svg className="w-7 h-7 text-blue-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 3.75H6.912a2.25 2.25 0 00-2.15 1.588L2.35 13.177a2.25 2.25 0 00-.1.661V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 00-2.15-1.588H15M2.25 13.5h3.86a2.25 2.25 0 012.012 1.244l.256.512a2.25 2.25 0 002.013 1.244h3.218a2.25 2.25 0 002.013-1.244l.256-.512a2.25 2.25 0 012.013-1.244h3.859M12 3v8.25m0 0l-3-3m3 3l3-3" />
              </svg>
            </div>
            <h3 className="font-['Space_Grotesk'] text-[22px] font-semibold text-slate-900 mb-3">Integración en Torneos</h3>
            <p className="text-slate-500 mb-6 flex-1 font-['Inter']">Participa en torneos de programación y mejora tu rendimiento con herramientas que te permiten competir al máximo nivel.</p>
            <TerminalSnippet filename="ejercicio.sh" lines={[
              <><span className="text-cyan-300">$</span> <span className="text-white/80"> Se ha analizado el ejercicio</span> </>,
              <><span className="text-cyan-300">$</span> <span className="text-white/80">optimización</span> <span className="text-white/60">-m</span> <span className="text-green-300"> "Auto-optimized"</span></>,
              <><span className="text-green-400">✓</span> <span className="text-white/60"> 1 archivos, +48 −12</span></>,
            ]} />
          </div>

          <div className="group p-8 rounded-3xl bg-white hover:shadow-lg transition-all duration-300 flex flex-col" style={hairline}>
            <div className="grid place-items-center w-14 h-14 rounded-2xl mb-7 bg-white" style={hairline}>
              <svg className="w-7 h-7 text-blue-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
              </svg>
            </div>
            <h3 className="font-['Space_Grotesk'] text-[22px] font-semibold text-slate-900 mb-3">Biblioteca actualizada</h3>
            <p className="text-slate-500 mb-6 flex-1 font-['Inter']">Una enorme biblioteca de ejercicios y aplicaciones para que no salgas del editor a buscar lógica común.</p>
            <div className="flex flex-wrap gap-2.5 content-start">
              {['Algoritmos', 'Estructuras', 'Grafos', 'DP', 'Matrices', 'Recursividad'].map((tag) => (
                <span key={tag} className="px-4 py-2 rounded-xl font-mono text-xs text-slate-500" style={{ background: '#f2f3ff', ...hairline }}>
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>

    <section className="py-40 border-y" style={{ background: '#f8fafc', borderColor: 'rgba(19,27,46,0.06)' }}>
      <div className="max-w-3xl mx-auto px-5 md:px-20">
        <div className="text-center mb-14">
          <span className="font-mono text-[13px] uppercase tracking-[0.18em] text-blue-700 block mb-5">
            03 — Preguntas frecuentes
          </span>
          <h2
            className="font-['Space_Grotesk'] font-semibold tracking-tight"
            style={{ fontSize: 'clamp(32px,4.4vw,48px)' }}
          >
            Todo lo que necesitas saber
          </h2>
        </div>
        <div className="space-y-3">
          {FAQS.map((faq) => <FAQItem key={faq.q} {...faq} />)}
        </div>
      </div>
    </section>

    <footer
      className="text-slate-900 w-full pt-24 pb-10 relative overflow-hidden border-t"
      style={{ background: '#f8fafc', borderColor: 'rgba(19,27,46,0.06)' }}
    >
      <div className="relative max-w-7xl mx-auto px-5 md:px-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-12 mb-16">
          <div className="lg:col-span-4">
            <Link to="/" className="flex items-center gap-2.5 mb-6">
              
              <span className="font-['Space_Grotesk'] text-[22px] font-bold tracking-tight text-slate-900">CODECOMP</span>
            </Link>
            <p className="text-slate-500 max-w-xs mb-8 font-['Inter']">
              El entorno de programación competitiva de nueva generación, potenciado por modelos de IA de élite.
            </p>
            <div className="flex gap-3">
              {[
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253" />,
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0021 18V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v12a2.25 2.25 0 002.25 2.25z" />,
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />,
              ].map((path, i) => (
                <a
                  key={i}
                  href="#"
                  className="grid place-items-center w-11 h-11 rounded-xl bg-white text-slate-500 hover:text-blue-700 transition-all"
                  style={{ ...hairline,}}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    {path}
                  </svg>
                </a>
              ))}
            </div>
          </div>

          {[
            { title: 'Producto', links: ['Características', 'Seguridad', 'Beta', 'Novedades'] },
            { title: 'Recursos', links: ['Documentación', 'API Reference', 'Comunidad', 'Tutoriales'] },
            { title: 'Legal', links: ['Términos', 'Privacidad', 'Cookies'] },
          ].map(({ title, links }) => (
            <div key={title} className="lg:col-span-2">
              <h4 className="text-slate-900 font-['Space_Grotesk'] font-semibold mb-5 text-[15px]">{title}</h4>
              <ul className="space-y-3.5 text-slate-500 text-[15px] font-['Inter']">
                {links.map((link) => (
                  <li key={link}>
                    <a href="#" className="hover:text-blue-700 transition-colors">{link}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div
          className="pt-8 border-t flex flex-col md:flex-row justify-between items-center gap-4"
          style={{ borderColor: 'rgba(19,27,46,0.10)' }}
        >
          <p className="text-slate-400 text-sm font-['Inter']">© 2026 CODECOMP · Universidad Francisco de Paula de Santander</p>
          <div className="flex gap-8 text-slate-400 text-sm font-['Inter']">
            <a href="#" className="hover:text-blue-700 transition-colors">Política de privacidad</a>
            <a href="#" className="hover:text-blue-700 transition-colors">Términos del servicio</a>
          </div>
        </div>
      </div>
    </footer>

  </div>
  );
};

export default HomePage;
