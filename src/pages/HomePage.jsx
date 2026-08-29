import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import LoginModal from '../components/LoginModal';
import { LENGUAJES } from '../scripts/problemsData';
import imgMaraton2026 from '../assets/noticias/maraton-nacional-2026.jpg';
import imgCalendario2026 from '../assets/noticias/calendario-rpc-2026.jpg';
import imgEquipos2025 from '../assets/noticias/equipos-maraton-2025.jpg';

// Enlaces del navbar: cada uno baja hasta la seccion que lleva ese id.
const NAV_LINKS = [
  { label: 'Plataforma',   id: 'plataforma' },
  { label: 'Herramientas', id: 'herramientas' },
  { label: 'Noticias',     id: 'noticias' },
  { label: 'Preguntas',    id: 'preguntas' },
];

const FAQS = [
  {
    q: '¿Qué es CODECOMP?',
    a: 'Una plataforma para practicar programación competitiva: eliges un ejercicio, escribes tu solución en el editor, la envías y recibes el veredicto al instante.',
  },
  {
    q: '¿Qué lenguajes puedo usar?',
    a: 'C#, Python 3, Java, C++ y JavaScript. Cada lenguaje trae una plantilla inicial lista para que empieces a escribir sin configurar nada.',
  },
  {
    q: '¿Cómo se evalúa mi código?',
    a: 'Tu solución se ejecuta contra los casos de prueba del ejercicio y se compara la salida esperada con la obtenida. Ves el resultado, el tiempo de ejecución y qué caso falló.',
  },
  {
    q: '¿Necesito experiencia previa?',
    a: 'No. Los ejercicios están organizados por categoría y dificultad, así que puedes arrancar por lo básico e ir subiendo de nivel a tu ritmo.',
  },
  {
    q: '¿Qué más hay además de los ejercicios?',
    a: 'Retos diarios, torneos, grupos de práctica, favoritos para guardar los ejercicios que quieras repetir y un historial con todos tus envíos.',
  },
  {
    q: '¿Tiene algún costo?',
    a: 'No. Crear tu cuenta y resolver ejercicios es gratis; solo necesitas registrarte para que tu progreso quede guardado.',
  },
];

// Novedades que se muestran por defecto, de la mas reciente a la mas antigua.
// "foco" es el object-position del recorte: cada imagen tiene una proporcion
// distinta y la franja las iguala a 16:9.
const NOTICIAS = [
  {
    fecha: '3 OCT 2026',
    etiqueta: 'Convocatoria',
    titulo: 'Abren las inscripciones de la XL Maratón Nacional',
    texto: 'La edición 2026 de la maratón ACIS/REDIS se corre el 3 de octubre, presencial y en seis sedes del país, con equipos de tres estudiantes y un coach. La inscripción temprana va hasta el 10 de septiembre y la regular del 11 al 18.',
    imagen: imgMaraton2026,
    // El afiche ya viene en 16:9, entra completo.
    foco: 'center',
    alt: 'Afiche de la XL Maratón Nacional de Programación ACIS/REDIS 2026',
  },
  {
    fecha: 'AÑO 2026',
    etiqueta: 'Calendario',
    titulo: 'Once fechas para entrenar durante el año',
    texto: 'La Red de Programación Competitiva ya publicó su calendario: once contests repartidos entre febrero y noviembre, más la Regional ICPC LATAM del 7 de noviembre. Sirve para planear la práctica mes a mes en vez de llegar a improvisar.',
    imagen: imgCalendario2026,
    // Casi 16:9, el recorte vertical es minimo.
    foco: 'center',
    alt: 'Calendario de competencias 2026 de la Red de Programación Competitiva',
  },
  {
    fecha: 'OCT 2025',
    etiqueta: 'Resultados',
    titulo: 'Cuatro problemas resueltos en la Maratón Nacional',
    texto: 'Los equipos ALPACA y FUNDA_CODERS sumaron cuatro soluciones en la XXXIX Maratón ACIS/REDIS. ALPACA resolvió tres, quedó en el puesto 15 del país y se ganó el cupo a la Regional Latinoamericana.',
    imagen: imgEquipos2025,
    // Ya viene recortada a la foto del grupo, en 16:9.
    foco: 'center',
    alt: 'Equipos de la maratón de programación celebrando con globos',
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

// Franja superior de una noticia. Si la imagen no carga se oculta la franja
// entera, asi la tarjeta nunca queda con el icono de roto.
const NoticiaImagen = ({ src, alt, foco = 'center' }) => {
  const [visible, setVisible] = useState(true);
  if (!src || !visible) return null;
  return (
    <div style={{ borderBottom:'2px solid #000', background:'#0736FE' }}>
      <img
        src={src}
        alt={alt}
        loading="lazy"
        onError={() => setVisible(false)}
        style={{ display:'block', width:'100%', height:'auto', aspectRatio:'16 / 9', objectFit:'cover', objectPosition:foco }}
      />
    </div>
  );
};

// Ficha de caracteristicas al pie de las tarjetas de herramientas.
const SpecSheet = ({ rows }) => (
  <div style={{ borderBottom:'2px solid #000' }}>
    {rows.map(({ label, value }) => (
      <div key={label} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, borderTop:'2px solid #000', padding:'10px 0' }}>
        <span style={{ fontFamily:grotesk, fontWeight:700, fontSize:15 }}>{label}</span>
        <span style={{ fontFamily:mono, fontWeight:700, fontSize:11.5, letterSpacing:'0.1em', textTransform:'uppercase', background:'#0736FE', color:'#fff', padding:'4px 9px', whiteSpace:'nowrap' }}>{value}</span>
      </div>
    ))}
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

  // Baja suavemente hasta la seccion enlazada desde el navbar o el footer.
  const scrollToSection = useCallback((id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

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
                  {NAV_LINKS.map(({ label, id }) => (
                    <button key={id} type="button" className="nb-nav-link" onClick={() => scrollToSection(id)}>{label}</button>
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
              <FloatCard className="nb-hero-card nb-hero-card-4" filename="Main.java" style={{ left:'6%', bottom:'9%', width:'clamp(96px,10.5vw,168px)', animation:'om-float-b 8.8s ease-in-out infinite' }}>
                {kw('class')}{' Main {\n  '}{kw('void')}{' main() {\n    solve();\n  }\n}'}
              </FloatCard>

              {/* Floating text snippets */}
              {[
                { t:'#include <bits/stdc++.h>', s:{ left:'23%', top:'8%', animation:'om-float-c 10s ease-in-out infinite', fontSize:'clamp(8px,0.85vw,14px)', color:'rgba(255,255,255,0.34)' } },
                { t:'O(n log n)',              s:{ right:'24%', top:'9%', animation:'om-float-a 9s ease-in-out infinite', fontSize:'clamp(10px,1.1vw,18px)', color:'rgba(255,255,255,0.4)' } },
                { t:'while (true)', sm:false, s:{ left:'17%', top:'46%', animation:'om-float-b 8.4s ease-in-out infinite', fontSize:'clamp(9px,0.95vw,15px)', color:'rgba(255,255,255,0.3)' } },
                { t:'print(resultado)', sm:false, s:{ right:'16%', top:'44%', animation:'om-float-c 9.2s ease-in-out infinite', fontSize:'clamp(8px,0.8vw,13px)', color:'rgba(255,255,255,0.3)' } },
                { t:'{ }',                    s:{ left:'31%', bottom:'6%', animation:'om-float-a 8.6s ease-in-out infinite', fontSize:'clamp(14px,1.8vw,30px)', color:'rgba(255,255,255,0.28)' } },
                { t:'return 0;',              s:{ right:'31%', bottom:'5%', animation:'om-float-b 7.8s ease-in-out infinite', fontSize:'clamp(9px,0.9vw,15px)', color:'rgba(255,255,255,0.32)' } },
                { t:'// TODO: optimizar',     s:{ left:'44%', top:'3%', animation:'om-float-c 9.8s ease-in-out infinite', fontSize:'clamp(8px,0.78vw,13px)', color:'rgba(255,255,255,0.28)', fontWeight:400 } },
                { t:'sizeof(int)', sm:false, s:{ right:'3.5%', top:'58%', animation:'om-float-a 10.4s ease-in-out infinite', fontSize:'clamp(8px,0.8vw,13px)', color:'rgba(255,255,255,0.26)' } },
                { t:'Scanner sc = new', sm:false, s:{ left:'3.5%', top:'57%', animation:'om-float-b 9.6s ease-in-out infinite', fontSize:'clamp(8px,0.8vw,13px)', color:'rgba(255,255,255,0.26)' } },
              ].map(({ t, s, sm = true }) => (
                <span key={t} className={sm ? 'nb-hero-text' : 'nb-hero-text hide-sm'} style={{ position:'absolute', fontFamily:mono, fontWeight:700, letterSpacing:'0.02em', whiteSpace:'nowrap', ...s }}>{t}</span>
              ))}
            </div>

            {/* Hero text */}
            <div className="nb-hero-inner">
              <h1 className="nb-hero-title">CODECOMP</h1>
              <p style={{ margin:'0 auto clamp(20px,3.6vh,40px)', fontSize:'clamp(15px,1.6vw,24px)', lineHeight:1.6, color:'#fff', fontWeight:500, maxWidth:'min(760px,88%)' }}>Resuelve ejercicios, envía tu código y recibe el veredicto al instante. Una plataforma hecha para entrenar programación competitiva sin salir del editor.</p>

              <div className="nb-hero-actions">
                <button type="button" onClick={openLogin} className="nb-hero-btn-white" style={{ cursor:'pointer', fontFamily:'inherit' }}>Empieza ahora <span style={{ fontFamily:mono }}>→</span></button>
                <button type="button" onClick={openLogin} className="nb-hero-btn-blue" style={{ cursor:'pointer', fontFamily:'inherit' }}>Ver retos</button>
                <img src="/cat-pixel.png" alt="" className="nb-hero-cat" style={{ width:'clamp(46px,4.6vw,78px)', height:'auto', imageRendering:'pixelated', alignSelf:'center', animation:'om-float-b 6s ease-in-out infinite', pointerEvents:'none' }} />
              </div>

              {/* Terminal */}
              <div className="nb-terminal">
                <span>$</span>
                <span>codecomp run --lang cpp --test all</span>
                <span style={{ width:'0.6em', height:'1.1em', background:'#fff', display:'inline-block', animation:'om-blink 1s steps(1) infinite' }}></span>
              </div>

              {/* Stats */}
              <div className="nb-stats">
                {[
                  { label:'envios hoy', value:'1.240' },
                  { label:'veredicto',  value:'AC 98%' },
                  { label:'runtime',    value:'0.42s' },
                  { label:'lenguajes',  value:String(LENGUAJES.length) },
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
        <section id="plataforma" className="nb-sec">
          <SectionTag n="01" label="Por qué CODECOMP" />

          {/* Panel destacado: los lenguajes que acepta el editor */}
          <div className="nb-lead-panel">
            <div>
              <span style={{ display:'inline-block', fontFamily:mono, fontWeight:700, fontSize:11, textTransform:'uppercase', letterSpacing:'0.16em', background:'#fff', border:'2px solid #000', padding:'6px 12px', marginBottom:18 }}>Editor multilenguaje</span>
              <h2 style={{ fontFamily:press, fontSize:'clamp(16px,2.1vw,30px)', color:'#fff', textShadow:'3px 3px 0px #000', margin:'0 0 16px', lineHeight:1.45 }}>{LENGUAJES.length} lenguajes</h2>
              <p style={{ margin:0, color:'#fff', fontSize:'clamp(14px,1.15vw,18px)', lineHeight:1.6, fontWeight:500 }}>Escoges un ejercicio y lo resuelves en el lenguaje que domines. Cada uno abre con su plantilla lista: la estructura base ya está escrita y solo te queda resolver.</p>
            </div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:12, alignContent:'center' }}>
              {LENGUAJES.map(lang => (
                <span key={lang.id} style={{ background:'#fff', border:'2px solid #000', boxShadow:'4px 4px 0px #000', padding:'9px 17px', fontFamily:mono, fontWeight:700, fontSize:14.5 }}>{lang.nombre}</span>
              ))}
            </div>
          </div>

          {/* Tres razones */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))', gap:24, marginTop:24 }}>
            <div className="nb-card" style={{ background:'#fff', border:'2px solid #000', boxShadow:'4px 4px 0px #000', padding:28 }}>
              <FeatureIcon>!</FeatureIcon>
              <h3 style={{ fontSize:'clamp(19px,1.7vw,26px)', fontWeight:700, margin:'0 0 10px', letterSpacing:'-0.02em' }}>Respuesta inmediata</h3>
              <p style={{ margin:'0 0 20px', fontSize:'clamp(14px,1.1vw,17px)', lineHeight:1.55, fontWeight:500 }}>Cada envío se compara con los casos de prueba del ejercicio y te dice exactamente qué pasó: qué caso falló, el tiempo y la salida obtenida.</p>
              <div style={{ height:20, border:'2px solid #000', background:'#fff', padding:2 }}>
                <div style={{ height:'100%', width:'92%', background:'#0736FE' }}></div>
              </div>
            </div>

            <div className="nb-card" style={{ background:'#fff', border:'2px solid #000', boxShadow:'4px 4px 0px #000', padding:28 }}>
              <FeatureIcon>//</FeatureIcon>
              <h3 style={{ fontSize:'clamp(19px,1.7vw,26px)', fontWeight:700, margin:'0 0 10px', letterSpacing:'-0.02em' }}>Ruta por dificultad</h3>
              <p style={{ margin:'0 0 18px', fontSize:'clamp(14px,1.1vw,17px)', lineHeight:1.55, fontWeight:500 }}>Los ejercicios están agrupados por categoría y nivel, así siempre sabes qué sigue en vez de saltar de un tema a otro sin orden.</p>
              <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                {['Básico','Intermedio','Avanzado'].map(t => (
                  <span key={t} style={{ background:'#0736FE', color:'#fff', border:'2px solid #000', padding:'6px 12px', fontFamily:mono, fontWeight:700, fontSize:12 }}>{t}</span>
                ))}
              </div>
            </div>

            <div className="nb-card" style={{ background:'#fff', border:'2px solid #000', boxShadow:'4px 4px 0px #000', padding:28 }}>
              <FeatureIcon>++</FeatureIcon>
              <h3 style={{ fontSize:'clamp(19px,1.7vw,26px)', fontWeight:700, margin:'0 0 10px', letterSpacing:'-0.02em' }}>Progreso que se queda</h3>
              <p style={{ margin:0, fontSize:'clamp(14px,1.1vw,17px)', lineHeight:1.55, fontWeight:500 }}>Tu historial de envíos, los ejercicios resueltos y los que marcaste como favoritos siguen ahí cada vez que vuelves a entrar.</p>
            </div>
          </div>
        </section>

        {/* ── 02 Herramientas ── */}
        <section id="herramientas" className="nb-sec nb-sec-tight">
          <SectionTag n="02" label="Herramientas" />
          <h2 style={{ fontFamily:press, fontSize:'clamp(20px,3.4vw,46px)', color:'#000', textShadow:'3px 3px 0px #0736FE,-2px -2px 0px #0736FE,2px -2px 0px #0736FE,-2px 2px 0px #0736FE,5px 5px 0px #000', margin:'0 0 40px', lineHeight:1.35, maxWidth:720 }}>Herramientas pensadas para ganar</h2>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))', gap:24 }}>
            <div className="nb-card" style={{ background:'#fff', border:'2px solid #000', boxShadow:'4px 4px 0px #000', padding:28, display:'flex', flexDirection:'column' }}>
              <FeatureIcon>&gt;_</FeatureIcon>
              <h3 style={{ fontSize:'clamp(18px,1.6vw,25px)', fontWeight:700, margin:'0 0 10px' }}>Editor con jueza integrada</h3>
              <p style={{ margin:'0 0 22px', fontSize:'clamp(14px,1.1vw,17px)', lineHeight:1.55, fontWeight:500, flex:1 }}>Escribe, ejecuta y envía desde la misma pantalla. La jueza corre tu código contra los casos de prueba y devuelve el veredicto.</p>
              <SpecSheet rows={[
                { label:'Ejecución',       value:'Automática' },
                { label:'Casos de prueba', value:'Incluidos' },
                { label:'Veredicto',       value:'Al instante' },
              ]} />
            </div>

            <div className="nb-card" style={{ background:'#fff', border:'2px solid #000', boxShadow:'4px 4px 0px #000', padding:28, display:'flex', flexDirection:'column' }}>
              <FeatureIcon>#1</FeatureIcon>
              <h3 style={{ fontSize:'clamp(18px,1.6vw,25px)', fontWeight:700, margin:'0 0 10px' }}>Torneos y grupos</h3>
              <p style={{ margin:'0 0 22px', fontSize:'clamp(14px,1.1vw,17px)', lineHeight:1.55, fontWeight:500, flex:1 }}>Compite contra otros en torneos con tiempo límite o entrena en grupo con retos compartidos y tabla de posiciones.</p>
              <SpecSheet rows={[
                { label:'Modalidad', value:'Torneo o grupo' },
                { label:'Duración',  value:'Configurable' },
                { label:'Ranking',   value:'En vivo' },
              ]} />
            </div>

            <div className="nb-card" style={{ background:'#fff', border:'2px solid #000', boxShadow:'4px 4px 0px #000', padding:28, display:'flex', flexDirection:'column' }}>
              <FeatureIcon>[]</FeatureIcon>
              <h3 style={{ fontSize:'clamp(18px,1.6vw,25px)', fontWeight:700, margin:'0 0 10px' }}>Biblioteca de ejercicios</h3>
              <p style={{ margin:'0 0 22px', fontSize:'clamp(14px,1.1vw,17px)', lineHeight:1.55, fontWeight:500, flex:1 }}>Un catálogo organizado por tema para encontrar rápido qué practicar, con favoritos para volver a lo que te costó resolver.</p>
              <div style={{ display:'flex', flexWrap:'wrap', gap:10 }}>
                {['Algoritmos','Estructuras','Grafos','DP','Matrices','Recursividad'].map(t => (
                  <span key={t} style={{ background:'#0736FE', color:'#fff', border:'2px solid #000', padding:'6px 12px', fontFamily:mono, fontWeight:700, fontSize:12 }}>{t}</span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── 03 Noticias ── */}
        <section id="noticias" className="nb-sec nb-sec-tight">
          <SectionTag n="03" label="Noticias" />
          <h2 style={{ fontFamily:press, fontSize:'clamp(17px,2.4vw,32px)', color:'#000', textShadow:'3px 3px 0px #0736FE', margin:'0 0 36px', lineHeight:1.4, maxWidth:640 }}>Lo último de la plataforma</h2>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))', gap:24 }}>
            {NOTICIAS.map(n => (
              <article key={n.titulo} className="nb-card" style={{ background:'#fff', border:'2px solid #000', boxShadow:'4px 4px 0px #000', display:'flex', flexDirection:'column', overflow:'hidden' }}>
                <NoticiaImagen src={n.imagen} alt={n.alt} foco={n.foco} />
                <div style={{ padding:26, display:'flex', flexDirection:'column', flex:1 }}>
                  <div style={{ display:'flex', alignItems:'center', flexWrap:'wrap', gap:10, marginBottom:16 }}>
                    <span style={{ background:'#0736FE', color:'#fff', border:'2px solid #000', padding:'5px 11px', fontFamily:mono, fontWeight:700, fontSize:11, letterSpacing:'0.1em', textTransform:'uppercase' }}>{n.etiqueta}</span>
                    <span style={{ fontFamily:mono, fontWeight:700, fontSize:11.5, letterSpacing:'0.1em', color:'#555' }}>{n.fecha}</span>
                  </div>
                  <h3 style={{ fontSize:'clamp(18px,1.6vw,24px)', fontWeight:700, margin:'0 0 12px', letterSpacing:'-0.02em', lineHeight:1.25 }}>{n.titulo}</h3>
                  <p style={{ margin:0, fontSize:'clamp(14px,1.1vw,17px)', lineHeight:1.55, fontWeight:500 }}>{n.texto}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* ── 04 FAQ ── */}
        <section id="preguntas" className="nb-sec nb-sec-tight" style={{ maxWidth:820 }}>
          <div style={{ textAlign:'center', marginBottom:36 }}>
            <span style={{ display:'inline-block', fontFamily:mono, fontWeight:700, fontSize:'clamp(11px,0.95vw,15px)', textTransform:'uppercase', letterSpacing:'0.16em', color:'#fff', background:'#0736FE', padding:'6px 12px', marginBottom:20 }}>04 — Preguntas frecuentes</span>
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
        <footer style={{ background:'#000', borderTop:'3px solid #000', padding:'40px 28px 24px' }}>
          <div style={{ maxWidth:1120, margin:'0 auto', display:'flex', flexWrap:'wrap', alignItems:'center', justifyContent:'space-between', gap:20, paddingBottom:22, borderBottom:'2px solid #fff' }}>
            <span style={{ fontFamily:press, fontSize:15, color:'#fff' }}>CODECOMP</span>
            <div style={{ display:'flex', flexWrap:'wrap', gap:24 }}>
              {NAV_LINKS.map(({ label, id }) => (
                <button key={id} type="button" className="nb-footer-link nb-footer-btn" onClick={() => scrollToSection(id)}>{label}</button>
              ))}
            </div>
          </div>
          <div style={{ maxWidth:1120, margin:'0 auto', paddingTop:20, display:'flex', flexWrap:'wrap', alignItems:'center', justifyContent:'space-between', gap:12 }}>
            <p style={{ margin:0, color:'#fff', fontFamily:mono, fontSize:12.5 }}>© 2026 CODECOMP</p>
            <Link to="/register" className="nb-footer-link" style={{ fontFamily:mono, fontSize:12.5 }}>Crear cuenta →</Link>
          </div>
        </footer>

      </div>

      <LoginModal open={loginOpen} onClose={closeLogin} topOffset={navH} />
    </>
  );
};

export default HomePage;
