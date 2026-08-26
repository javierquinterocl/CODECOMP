import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import LoginModal from './components/LoginModal';

const FAQS = [
  {
    q: '¿Cuál es la pregunta de investigación?',
    a: '¿De qué manera una plataforma de aprendizaje con retroalimentación automatizada contribuye a mantener la continuidad y el mejoramiento de las habilidades algorítmicas de los estudiantes del grupo de maratón de programación en Ingeniería de Sistemas de la Universidad Francisco de Paula Santander Ocaña?',
  },
  {
    q: '¿A quién está dirigida la plataforma?',
    a: 'A los estudiantes de Ingeniería de Sistemas de la UFPS Ocaña que hacen parte del grupo estable de maratón de programación. Se excluye a quienes pertenezcan a otros programas académicos o carezcan de bases en programación.',
  },
  {
    q: '¿Qué objetivos específicos tiene el proyecto?',
    a: 'Analizar el desempeño actual y los factores de discontinuidad; diseñar la arquitectura del sistema por módulos; construir la plataforma priorizando el rendimiento de la retroalimentación automatizada; y medir su funcionalidad en sesiones de prueba con el grupo.',
  },
  {
    q: '¿Reemplaza al docente?',
    a: 'No. La retroalimentación automática acorta la espera y conserva el historial más allá del cambio de instructores, mientras el docente asume su rol de guía con un acompañamiento informado.',
  },
  {
    q: '¿Qué mide el seguimiento?',
    a: 'Intentos, veredictos, tiempos y temas trabajados por estudiante, para identificar bajo desempeño e intervenir antes de que se produzca el abandono del grupo.',
  },
  {
    q: '¿Cuánto dura el desarrollo?',
    a: 'Ocho semanas una vez aprobado el anteproyecto. El proyecto se desarrolla en Ocaña, Norte de Santander, dentro de la Universidad Francisco de Paula Santander Ocaña.',
  },
];

const mono = "'JetBrains Mono',monospace";
const press = "'Press Start 2P',monospace";
const grotesk = "'Space Grotesk',sans-serif";

const FloatCard = ({ style, filename, className = '', children }) => (
  <div className={className} style={{ position:'absolute', background:'rgba(255,255,255,0.12)', border:'2px solid rgba(255,255,255,0.45)', boxShadow:'6px 6px 0px rgba(255,255,255,0.14)', textAlign:'left', overflow:'hidden', ...style }}>
    <div style={{ display:'flex', alignItems:'center', gap:6, background:'rgba(255,255,255,0.22)', padding:'5px 8px' }}>
      <span style={{ width:7, height:7, background:'rgba(255,255,255,0.7)', display:'block' }}></span>
      <span style={{ width:7, height:7, background:'rgba(255,255,255,0.4)', display:'block' }}></span>
      <span style={{ fontFamily:mono, fontSize:'clamp(7px,0.6vw,10px)', fontWeight:700, color:'rgba(255,255,255,0.8)', letterSpacing:'0.1em', marginLeft:'auto' }}>{filename}</span>
    </div>
    <pre style={{ margin:0, padding:'9px 10px', fontFamily:mono, fontSize:'clamp(7px,0.64vw,11px)', lineHeight:1.65, color:'rgba(255,255,255,0.75)', whiteSpace:'pre' }}>{children}</pre>
  </div>
);

const kw = txt => <span style={{ color:'rgba(255,255,255,0.95)' }}>{txt}</span>;

const SectionTag = ({ n, label }) => (
  <div style={{ display:'flex', alignItems:'center', gap:16, marginBottom:28 }}>
    <span style={{ fontFamily:mono, fontWeight:700, fontSize:'clamp(11px,0.95vw,15px)', textTransform:'uppercase', letterSpacing:'0.16em', color:'#fff', background:'#0736FE', padding:'6px 12px' }}>{n} — {label}</span>
    <span style={{ flex:1, height:3, background:'#000', display:'block' }}></span>
  </div>
);

const FeatureIcon = ({ children }) => (
  <div style={{ width:64, height:64, background:'#0736FE', color:'#fff', border:'2px solid #000', display:'grid', placeItems:'center', fontFamily:press, fontSize:18, marginBottom:22 }}>{children}</div>
);

const TerminalBox = ({ filename, lines }) => (
  <div style={{ border:'2px solid #000', background:'#000' }}>
    <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 12px', borderBottom:'2px solid #fff' }}>
      <span style={{ width:10, height:10, background:'#fff', display:'block' }}></span>
      <span style={{ fontFamily:mono, fontWeight:700, fontSize:11, color:'#fff' }}>{filename}</span>
    </div>
    <div style={{ padding:14, fontFamily:mono, fontSize:12.5, lineHeight:1.8, color:'#fff' }}>
      {lines.map((l, i) => <div key={i}><span style={{ color:'#fff' }}>{l.prefix}</span> {l.text}</div>)}
    </div>
  </div>
);

const HomePage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [openFaq, setOpenFaq] = useState(null);
  // Quien llega redirigido desde una ruta protegida (o desde /login) entra
  // con el panel de sesión ya abierto.
  const [loginOpen, setLoginOpen] = useState(Boolean(location.state?.openLogin));
  const [navH, setNavH] = useState('79px');
  const navRef = useRef(null);

  // Mide el navbar para que el panel de login arranque justo debajo
  useEffect(() => {
    const measure = () => {
      if (!navRef.current) return;
      setNavH(`${Math.round(navRef.current.getBoundingClientRect().height)}px`);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  // Limpia el state de navegación para que el panel no reaparezca al volver atrás.
  useEffect(() => {
    if (!location.state?.openLogin) return;
    navigate(location.pathname, { replace: true, state: null });
  }, [location, navigate]);

  const openLogin = useCallback((e) => { if (e) e.preventDefault(); setLoginOpen(true); }, []);
  const closeLogin = useCallback(() => setLoginOpen(false), []);

  return (
    <>
      <div className="nb-page">

        {/* ── Navbar + Hero (full viewport height) ── */}
        <div className="nb-hero-wrap">

          {/* Navbar */}
          <nav ref={navRef} style={{ background:'#fff', borderBottom:'3px solid #000', flex:'0 0 auto', zIndex:50 }}>
            <div className="nb-nav-inner">
              <div style={{ display:'flex', alignItems:'center', gap:36 }}>
                <span className="nb-brand">CODECOMP</span>
                <div className="nb-nav-links">
                  {['Producto','Retos','Seguridad','Recursos'].map(l => (
                    <span key={l} className="nb-nav-link">{l}</span>
                  ))}
                </div>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                <button type="button" onClick={openLogin} className="nb-btn-white" style={{ cursor:'pointer', fontFamily:'inherit' }}>Iniciar sesión</button>
                <Link to="/register" className="nb-btn-blue">Registrarse</Link>
              </div>
            </div>
          </nav>

          {/* Hero */}
          <section className="nb-hero">
            {/* Grid overlay */}
            <div className="nb-hero-grid" />

            {/* Floating code cards */}
            <div className="nb-hero-deco" aria-hidden="true">
              <FloatCard className="nb-hero-card nb-hero-card-1" filename="main.cpp" style={{ right:'1.5%', top:'6%', width:'clamp(118px,13vw,208px)', animation:'om-float-b 8.5s ease-in-out infinite' }}>
                {kw('int')}{' main() {\n  '}{kw('int')}{' n;\n  cin >> n;\n  solve(n);\n  '}{kw('return')}{' 0;\n}'}
              </FloatCard>
              <FloatCard className="nb-hero-card nb-hero-card-2" filename="solve.py" style={{ left:'3%', top:'14%', width:'clamp(120px,13.5vw,214px)', animation:'om-float-a 7.5s ease-in-out infinite' }}>
                {kw('def')}{' solve(n):\n  dp = [0] * (n+1)\n  '}{kw('for')}{' i '}{kw('in')}{' range(n):\n    dp[i+1] = dp[i] + i\n  '}{kw('return')}{' dp[n]'}
              </FloatCard>
              <FloatCard className="nb-hero-card nb-hero-card-3" filename="judge.log" style={{ right:'5%', bottom:'8%', width:'clamp(104px,11.5vw,182px)', animation:'om-float-c 9.5s ease-in-out infinite' }}>
                {kw('AC')}{'  0.42s  12MB\n'}{kw('AC')}{'  0.31s  11MB\nTLE 2.00s  --\n'}{kw('AC')}{'  0.18s  10MB'}
              </FloatCard>
              <FloatCard className="nb-hero-card nb-hero-card-4" filename="main.rs" style={{ left:'6%', bottom:'9%', width:'clamp(96px,10.5vw,168px)', animation:'om-float-b 8.8s ease-in-out infinite' }}>
                {kw('fn')}{' main() {\n  '}{kw('let')}{' n = read();\n  println!("{}", n);\n}'}
              </FloatCard>

              {/* Floating text snippets */}
              {[
                { t:'#include <bits/stdc++.h>', s:{ left:'23%', top:'8%', animation:'om-float-c 10s ease-in-out infinite', fontSize:'clamp(8px,0.85vw,14px)', color:'rgba(255,255,255,0.34)' } },
                { t:'O(n log n)',              s:{ right:'24%', top:'9%', animation:'om-float-a 9s ease-in-out infinite', fontSize:'clamp(10px,1.1vw,18px)', color:'rgba(255,255,255,0.4)' } },
                { t:'while (true)', sm:false, s:{ left:'17%', top:'46%', animation:'om-float-b 8.4s ease-in-out infinite', fontSize:'clamp(9px,0.95vw,15px)', color:'rgba(255,255,255,0.3)' } },
                { t:'git push origin main', sm:false, s:{ right:'16%', top:'44%', animation:'om-float-c 9.2s ease-in-out infinite', fontSize:'clamp(8px,0.8vw,13px)', color:'rgba(255,255,255,0.3)' } },
                { t:'{ }',                    s:{ left:'31%', bottom:'6%', animation:'om-float-a 8.6s ease-in-out infinite', fontSize:'clamp(14px,1.8vw,30px)', color:'rgba(255,255,255,0.28)' } },
                { t:'return 0;',              s:{ right:'31%', bottom:'5%', animation:'om-float-b 7.8s ease-in-out infinite', fontSize:'clamp(9px,0.9vw,15px)', color:'rgba(255,255,255,0.32)' } },
                { t:'// TODO: optimizar',     s:{ left:'44%', top:'3%', animation:'om-float-c 9.8s ease-in-out infinite', fontSize:'clamp(8px,0.78vw,13px)', color:'rgba(255,255,255,0.28)', fontWeight:400 } },
                { t:'sizeof(int)', sm:false, s:{ right:'3.5%', top:'58%', animation:'om-float-a 10.4s ease-in-out infinite', fontSize:'clamp(8px,0.8vw,13px)', color:'rgba(255,255,255,0.26)' } },
                { t:'npm run judge', sm:false, s:{ left:'3.5%', top:'57%', animation:'om-float-b 9.6s ease-in-out infinite', fontSize:'clamp(8px,0.8vw,13px)', color:'rgba(255,255,255,0.26)' } },
              ].map(({ t, s, sm = true }) => (
                <span key={t} className={sm ? 'nb-hero-text' : 'nb-hero-text hide-sm'} style={{ position:'absolute', fontFamily:mono, fontWeight:700, letterSpacing:'0.02em', whiteSpace:'nowrap', ...s }}>{t}</span>
              ))}
            </div>

            {/* Hero text */}
            <div className="nb-hero-inner">
              <h1 className="nb-hero-title">CODECOMP</h1>
              <p style={{ margin:'0 auto clamp(20px,3.6vh,40px)', fontSize:'clamp(15px,1.6vw,24px)', lineHeight:1.6, color:'#fff', fontWeight:500, maxWidth:'min(760px,88%)' }}>Eficiencia y precisión sin igual gracias a herramientas inteligentes diseñadas para acelerar tu flujo, potenciar la creatividad y redefinir tu codigo.</p>

              <div className="nb-hero-actions">
                <button type="button" onClick={openLogin} className="nb-hero-btn-white" style={{ cursor:'pointer', fontFamily:'inherit' }}>Empieza ahora <span style={{ fontFamily:mono }}>→</span></button>
                <button type="button" onClick={openLogin} className="nb-hero-btn-blue" style={{ cursor:'pointer', fontFamily:'inherit' }}>Ver retos</button>
                <img src="/cat-pixel.png" alt="" className="nb-hero-cat" style={{ width:'clamp(46px,4.6vw,78px)', height:'auto', imageRendering:'pixelated', alignSelf:'center', animation:'om-float-b 6s ease-in-out infinite', pointerEvents:'none' }} />
              </div>

              {/* Terminal */}
              <div className="nb-terminal">
                <span>$</span>
                <span>codecomp run --lang cpp --judge ufpso</span>
                <span style={{ width:'0.6em', height:'1.1em', background:'#fff', display:'inline-block', animation:'om-blink 1s steps(1) infinite' }}></span>
              </div>

              {/* Stats */}
              <div className="nb-stats">
                {[
                  { label:'envios hoy', value:'1.240' },
                  { label:'veredicto',  value:'AC 98%' },
                  { label:'runtime',    value:'0.42s' },
                  { label:'ranking',    value:'UFPSO' },
                ].map(s => (
                  <div key={s.label} style={{ background:'#fff', border:'2px solid #000', boxShadow:'5px 5px 0px #000', padding:'clamp(8px,1vw,14px) clamp(10px,1.2vw,18px)', textAlign:'left' }}>
                    <div style={{ fontFamily:mono, fontWeight:700, fontSize:'clamp(8px,0.7vw,11px)', letterSpacing:'0.16em', textTransform:'uppercase', color:'#0736FE', marginBottom:4 }}>{s.label}</div>
                    <div style={{ fontFamily:press, fontSize:'clamp(10px,1.1vw,17px)', color:'#000' }}>{s.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>

        {/* ── 01 Por qué CODECOMP ── */}
        <section style={{ maxWidth:1120, margin:'0 auto', padding:'72px 28px 84px' }}>
          <SectionTag n="01" label="Por qué CODECOMP" />
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))', gap:24 }}>
            <div className="nb-card" style={{ background:'#fff', border:'2px solid #000', boxShadow:'4px 4px 0px #000', padding:28 }}>
              <FeatureIcon>✓</FeatureIcon>
              <h3 style={{ fontSize:'clamp(22px,2.1vw,34px)', fontWeight:700, margin:'0 0 10px', letterSpacing:'-0.02em' }}>99.9% de precisión</h3>
              <p style={{ margin:'0 0 20px', fontSize:'clamp(14px,1.1vw,17px)', lineHeight:1.55, fontWeight:500 }}>Modelos afinados con datos de programación competitiva de alta calidad, para una precisión inigualable.</p>
              <div style={{ height:20, border:'2px solid #000', background:'#fff', padding:2 }}>
                <div style={{ height:'100%', width:'99.9%', background:'#0736FE' }}></div>
              </div>
            </div>

            <div className="nb-card" style={{ background:'#fff', border:'2px solid #000', boxShadow:'4px 4px 0px #000', padding:28 }}>
              <FeatureIcon>##</FeatureIcon>
              <div style={{ fontFamily:press, fontSize:'clamp(22px,2.1vw,34px)', lineHeight:1.2, marginBottom:16 }}>UFPSO</div>
              <p style={{ fontWeight:700, fontSize:'clamp(16px,1.3vw,20px)', margin:'0 0 6px' }}>Estudiantes</p>
              <p style={{ margin:0, fontSize:'clamp(14px,1.1vw,17px)', lineHeight:1.55, fontWeight:500 }}>Un espacio para estudiantes de programación competitiva.</p>
            </div>

            <div className="nb-card" style={{ background:'#fff', border:'2px solid #000', boxShadow:'4px 4px 0px #000', padding:28 }}>
              <FeatureIcon>!</FeatureIcon>
              <div style={{ fontFamily:press, fontSize:'clamp(19px,1.9vw,30px)', lineHeight:1.2, marginBottom:16 }}>&lt;100ms</div>
              <p style={{ fontWeight:700, fontSize:'clamp(16px,1.3vw,20px)', margin:'0 0 6px' }}>Latencia de sugerencia</p>
              <p style={{ margin:0, fontSize:'clamp(14px,1.1vw,17px)', lineHeight:1.55, fontWeight:500 }}>Asistencia en tiempo real que sigue el ritmo de tu escritura.</p>
            </div>
          </div>

          {/* Languages banner */}
          <div style={{ background:'#0736FE', border:'2px solid #000', boxShadow:'4px 4px 0px #000', padding:32, marginTop:24, display:'flex', flexWrap:'wrap', alignItems:'center', justifyContent:'space-between', gap:28 }}>
            <div style={{ maxWidth:480 }}>
              <span style={{ display:'inline-block', fontFamily:mono, fontWeight:700, fontSize:11, textTransform:'uppercase', letterSpacing:'0.16em', background:'#fff', border:'2px solid #000', padding:'6px 12px', marginBottom:16 }}>Soporte universal</span>
              <h3 style={{ fontFamily:press, fontSize:'clamp(18px,2vw,30px)', color:'#fff', textShadow:'3px 3px 0px #000', margin:'0 0 12px', lineHeight:1.35 }}>40+ lenguajes</h3>
              <p style={{ margin:0, color:'#fff', fontSize:'clamp(14px,1.1vw,17px)', lineHeight:1.55, fontWeight:500 }}>De C++ y Python a Rust y Haskell: CODECOMP entiende los matices de cada paradigma.</p>
            </div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:12, maxWidth:420 }}>
              {['C++','Python','Rust','Go','Java','TypeScript'].map(lang => (
                <span key={lang} style={{ background:'#fff', border:'2px solid #000', boxShadow:'4px 4px 0px #000', padding:'8px 16px', fontFamily:mono, fontWeight:700, fontSize:14 }}>{lang}</span>
              ))}
            </div>
          </div>
        </section>

        {/* ── 02 Herramientas ── */}
        <section style={{ maxWidth:1120, margin:'0 auto', padding:'0 28px 84px' }}>
          <SectionTag n="02" label="Herramientas" />
          <div style={{ display:'flex', flexWrap:'wrap', alignItems:'flex-end', justifyContent:'space-between', gap:24, marginBottom:36 }}>
            <h2 style={{ fontFamily:press, fontSize:'clamp(20px,3.4vw,46px)', color:'#000', textShadow:'3px 3px 0px #0736FE,-2px -2px 0px #0736FE,2px -2px 0px #0736FE,-2px 2px 0px #0736FE,5px 5px 0px #000', margin:0, lineHeight:1.35, maxWidth:620 }}>Herramientas pensadas para ganar</h2>
            <p style={{ maxWidth:380, margin:0, fontWeight:500, fontSize:'clamp(14px,1.2vw,18px)', lineHeight:1.6 }}>Diseña y lanza algoritmos en pocos clics. Un flujo de trabajo hecho para la creatividad y la eficiencia.</p>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))', gap:24 }}>
            <div className="nb-card" style={{ background:'#fff', border:'2px solid #000', boxShadow:'4px 4px 0px #000', padding:28, display:'flex', flexDirection:'column' }}>
              <FeatureIcon>[]</FeatureIcon>
              <h3 style={{ fontSize:'clamp(18px,1.6vw,25px)', fontWeight:700, margin:'0 0 10px' }}>Ejecucion segura de Jueza</h3>
              <p style={{ margin:'0 0 22px', fontSize:'clamp(14px,1.1vw,17px)', lineHeight:1.55, fontWeight:500, flex:1 }}>Herramientas para optimizar tu código a nivel competitivo.</p>
              <TerminalBox filename="auth.sh" lines={[
                { prefix:'$', text:'Ejecutando Ejercicio --rotate' },
                { prefix:'✓', text:'Tiempo de ejecucion: 2.34s' },
                { prefix:'$', text:'"Operacion completada"' },
              ]} />
            </div>

            <div className="nb-card" style={{ background:'#fff', border:'2px solid #000', boxShadow:'4px 4px 0px #000', padding:28, display:'flex', flexDirection:'column' }}>
              <FeatureIcon>VS</FeatureIcon>
              <h3 style={{ fontSize:'clamp(18px,1.6vw,25px)', fontWeight:700, margin:'0 0 10px' }}>Integración en Torneos</h3>
              <p style={{ margin:'0 0 22px', fontSize:'clamp(14px,1.1vw,17px)', lineHeight:1.55, fontWeight:500, flex:1 }}>Participa en torneos de programación y mejora tu rendimiento con herramientas que te permiten competir al máximo nivel.</p>
              <TerminalBox filename="ejercicio.sh" lines={[
                { prefix:'$', text:'Se ha analizado el ejercicio' },
                { prefix:'$', text:'optimización -m "Auto-optimized"' },
                { prefix:'✓', text:'1 archivos, +48 −12' },
              ]} />
            </div>

            <div className="nb-card" style={{ background:'#fff', border:'2px solid #000', boxShadow:'4px 4px 0px #000', padding:28, display:'flex', flexDirection:'column' }}>
              <FeatureIcon>::</FeatureIcon>
              <h3 style={{ fontSize:'clamp(18px,1.6vw,25px)', fontWeight:700, margin:'0 0 10px' }}>Biblioteca actualizada</h3>
              <p style={{ margin:'0 0 22px', fontSize:'clamp(14px,1.1vw,17px)', lineHeight:1.55, fontWeight:500, flex:1 }}>Una enorme biblioteca de ejercicios y aplicaciones para que no salgas del editor a buscar lógica común.</p>
              <div style={{ display:'flex', flexWrap:'wrap', gap:10 }}>
                {['Algoritmos','Estructuras','Grafos','DP','Matrices','Recursividad'].map(t => (
                  <span key={t} style={{ background:'#0736FE', color:'#fff', border:'2px solid #000', padding:'6px 12px', fontFamily:mono, fontWeight:700, fontSize:12 }}>{t}</span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── 03 FAQ ── */}
        <section style={{ maxWidth:820, margin:'0 auto', padding:'0 28px 84px' }}>
          <div style={{ textAlign:'center', marginBottom:36 }}>
            <span style={{ display:'inline-block', fontFamily:mono, fontWeight:700, fontSize:'clamp(11px,0.95vw,15px)', textTransform:'uppercase', letterSpacing:'0.16em', color:'#fff', background:'#0736FE', padding:'6px 12px', marginBottom:20 }}>03 — Preguntas frecuentes</span>
            <h2 style={{ fontFamily:press, fontSize:'clamp(18px,2.8vw,38px)', color:'#000', textShadow:'4px 4px 0px #0736FE', margin:0, lineHeight:1.4 }}>Todo lo que necesitas saber</h2>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            {FAQS.map((faq, i) => {
              const open = openFaq === i;
              return (
                <div key={i} style={{ background:'#fff', border:'2px solid #000', boxShadow:'4px 4px 0px #000' }}>
                  <button
                    onClick={() => setOpenFaq(open ? null : i)}
                    style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between', gap:16, textAlign:'left', padding:'18px 20px', background:'transparent', border:'none', cursor:'pointer', fontFamily:grotesk, fontSize:'clamp(15px,1.4vw,20px)', fontWeight:700, color:'#000' }}
                  >
                    <span>{faq.q}</span>
                    <span style={{ width:32, height:32, flexShrink:0, background:'#0736FE', color:'#fff', border:'2px solid #000', display:'grid', placeItems:'center', fontFamily:mono, fontWeight:700, fontSize:16 }}>{open ? '−' : '+'}</span>
                  </button>
                  <div className={`nb-faq-body${open ? ' is-open' : ''}`}>
                    <div>
                      <p style={{ margin:0, padding:'16px 20px 20px', fontSize:'clamp(14px,1.1vw,17px)', lineHeight:1.6, fontWeight:500, borderTop:'2px solid #000' }}>{faq.a}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Footer ── */}
        <footer style={{ background:'#000', borderTop:'3px solid #000', padding:'56px 28px 28px' }}>
          <div style={{ maxWidth:1120, margin:'0 auto', display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:40, marginBottom:44 }}>
            <div>
              <span style={{ fontFamily:press, fontSize:15, color:'#fff', display:'block', marginBottom:18 }}>CODECOMP</span>
              <p style={{ margin:'0 0 22px', color:'#fff', fontSize:15, lineHeight:1.6, fontWeight:500, maxWidth:280 }}>El entorno de programación competitiva de nueva generación, potenciado por modelos de IA de élite.</p>
              <div style={{ display:'flex', gap:10 }}>
                {['W','>','@'].map(icon => (
                  <a key={icon} href="#" className="nb-social-btn">{icon}</a>
                ))}
              </div>
            </div>
            <div>
              <h4 style={{ color:'#fff', fontSize:14, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.12em', margin:'0 0 16px' }}>Producto</h4>
              <div style={{ display:'flex', flexDirection:'column', gap:12, fontSize:15, fontWeight:500 }}>
                {['Características','Seguridad','Beta','Novedades'].map(l => <a key={l} href="#" className="nb-footer-link">{l}</a>)}
              </div>
            </div>
            <div>
              <h4 style={{ color:'#fff', fontSize:14, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.12em', margin:'0 0 16px' }}>Recursos</h4>
              <div style={{ display:'flex', flexDirection:'column', gap:12, fontSize:15, fontWeight:500 }}>
                {['Documentación','API Reference','Comunidad','Tutoriales'].map(l => <a key={l} href="#" className="nb-footer-link">{l}</a>)}
              </div>
            </div>
            <div>
              <h4 style={{ color:'#fff', fontSize:14, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.12em', margin:'0 0 16px' }}>Legal</h4>
              <div style={{ display:'flex', flexDirection:'column', gap:12, fontSize:15, fontWeight:500 }}>
                {['Términos','Privacidad','Cookies'].map(l => <a key={l} href="#" className="nb-footer-link">{l}</a>)}
              </div>
            </div>
          </div>
          <div style={{ maxWidth:1120, margin:'0 auto', paddingTop:22, borderTop:'2px solid #fff', display:'flex', flexWrap:'wrap', justifyContent:'space-between', gap:16 }}>
            <p style={{ margin:0, color:'#fff', fontFamily:mono, fontSize:12.5 }}>© 2026 CODECOMP · Universidad Francisco de Paula de Santander</p>
            <div style={{ display:'flex', gap:24, fontFamily:mono, fontSize:12.5 }}>
              <a href="#" className="nb-footer-link">Política de privacidad</a>
              <a href="#" className="nb-footer-link">Términos del servicio</a>
            </div>
          </div>
        </footer>

      </div>

      <LoginModal open={loginOpen} onClose={closeLogin} topOffset={navH} />
    </>
  );
};

export default HomePage;
