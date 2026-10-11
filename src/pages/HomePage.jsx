import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import LoginModal from '../components/LoginModal';
import { LENGUAJES } from '../scripts/problemsData';
import imgMaraton2026 from '../assets/noticias/maraton-nacional-2026.jpg';
import imgCalendario2026 from '../assets/noticias/calendario-rpc-2026.jpg';
import imgEquipos2025 from '../assets/noticias/equipos-maraton-2025.jpg';
import imgEdificio from '../assets/hero-edificio-ingenieria.webp';
import logoUfps from '../assets/logo-ufps-blanco.png';

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

// Novedades, de la mas reciente a la mas antigua. "foco" es el object-position
// del recorte: la franja iguala todas las imagenes a 16:9.
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

// Textos sueltos del hero. Cada uno trae su sitio, su tamaño y su ritmo; la
// animación la pone la clase .nb-hero-text a partir de --nb-float y --nb-dur.
// `sm: false` los esconde cuando el hero se estrecha.
const HERO_TEXTS = [
  { t: '#include <bits/stdc++.h>', s: { left: '23%', top: '8%', '--nb-float': 'om-float-c', '--nb-dur': '10s', fontSize: 'clamp(8px,0.85vw,14px)', color: 'rgba(255,255,255,0.34)' } },
  { t: 'O(n log n)', s: { right: '24%', top: '9%', '--nb-float': 'om-float-a', '--nb-dur': '9s', fontSize: 'clamp(10px,1.1vw,18px)', color: 'rgba(255,255,255,0.4)' } },
  { t: 'while (true)', sm: false, s: { left: '17%', top: '46%', '--nb-float': 'om-float-b', '--nb-dur': '8.4s', fontSize: 'clamp(9px,0.95vw,15px)', color: 'rgba(255,255,255,0.3)' } },
  // A la altura de los botones, no del párrafo: más arriba se montaba sobre el texto.
  { t: 'print(resultado)', sm: false, s: { right: '16%', top: '53%', '--nb-float': 'om-float-c', '--nb-dur': '9.2s', fontSize: 'clamp(8px,0.8vw,13px)', color: 'rgba(255,255,255,0.3)' } },
  { t: '{ }', s: { left: '31%', bottom: '6%', '--nb-float': 'om-float-a', '--nb-dur': '8.6s', fontSize: 'clamp(14px,1.8vw,30px)', color: 'rgba(255,255,255,0.28)' } },
  { t: 'return 0;', s: { right: '31%', bottom: '5%', '--nb-float': 'om-float-b', '--nb-dur': '7.8s', fontSize: 'clamp(9px,0.9vw,15px)', color: 'rgba(255,255,255,0.32)' } },
  { t: '// TODO: optimizar', s: { left: '44%', top: '3%', '--nb-float': 'om-float-c', '--nb-dur': '9.8s', fontSize: 'clamp(8px,0.78vw,13px)', color: 'rgba(255,255,255,0.28)', fontWeight: 400 } },
  { t: 'sizeof(int)', sm: false, s: { right: '3.5%', top: '58%', '--nb-float': 'om-float-a', '--nb-dur': '10.4s', fontSize: 'clamp(8px,0.8vw,13px)', color: 'rgba(255,255,255,0.26)' } },
  { t: 'Scanner sc = new', sm: false, s: { left: '3.5%', top: '57%', '--nb-float': 'om-float-b', '--nb-dur': '9.6s', fontSize: 'clamp(8px,0.8vw,13px)', color: 'rgba(255,255,255,0.26)' } },
];

const HERO_STATS = [
  { label: 'envios hoy', value: '1.240' },
  { label: 'veredicto',  value: 'AC 98%' },
  { label: 'runtime',    value: '0.42s' },
  { label: 'lenguajes',  value: String(LENGUAJES.length) },
];

const SectionTag = ({ n, label }) => (
  <div className="nb-sectag">
    <span className="nb-sectag-label">{n} — {label}</span>
    <span className="nb-sectag-rule"></span>
  </div>
);

const FeatureIcon = ({ children }) => (
  <div className="nb-feature-icon">{children}</div>
);

// Si la imagen no carga se oculta la franja entera, no el icono de roto.
const NoticiaImagen = ({ src, alt, foco = 'center' }) => {
  const [visible, setVisible] = useState(true);
  if (!src || !visible) return null;
  return (
    <div className="nb-news-img">
      <img
        src={src}
        alt={alt}
        width="1000"
        height="563"
        loading="lazy"
        onError={() => setVisible(false)}
        style={{ objectPosition: foco }}
      />
    </div>
  );
};

// Ficha de caracteristicas al pie de las tarjetas de herramientas.
const SpecSheet = ({ rows }) => (
  <div className="nb-spec">
    {rows.map(({ label, value }) => (
      <div key={label} className="nb-spec-row">
        <span className="nb-spec-label">{label}</span>
        <span className="nb-spec-value">{value}</span>
      </div>
    ))}
  </div>
);

const HomePage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [openFaq, setOpenFaq] = useState(null);
  // Llegar redirigido desde una ruta protegida abre el panel de sesión.
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

  // Baja hasta la seccion enlazada desde el navbar o el footer; de golpe si
  // el sistema pide menos movimiento.
  const scrollToSection = useCallback((id) => {
    const quieto = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.getElementById(id)?.scrollIntoView({ behavior: quieto ? 'auto' : 'smooth', block: 'start' });
  }, []);

  return (
    <>
      <div className="nb-page">

        {/* ── Navbar + Hero (full viewport height) ── */}
        <div className="nb-hero-wrap">

          {/* Navbar */}
          <nav ref={navRef} className="nb-nav">
            <div className="nb-nav-inner">
              <div className="nb-nav-left">
                <span className="nb-brand" translate="no">CODECOMP</span>
                <div className="nb-nav-links">
                  {NAV_LINKS.map(({ label, id }) => (
                    <button key={id} type="button" className="nb-nav-link" onClick={() => scrollToSection(id)}>{label}</button>
                  ))}
                </div>
              </div>
              <div className="nb-nav-actions">
                <button type="button" onClick={openLogin} className="nb-btn-white">Iniciar sesión</button>
                <Link to="/register" className="nb-btn-blue">Registrarse</Link>
              </div>
            </div>
          </nav>

          {/* Hero */}
          <section className="nb-hero">
            {/* Dibujo del edificio de Ingeniería, bajo la cuadrícula */}
            <div className="nb-hero-foto" style={{ backgroundImage: `url(${imgEdificio})` }} />
            <div className="nb-hero-grid" />
            <img className="nb-hero-ufps" src={logoUfps} alt="UFPS Ocaña" width="500" height="500" />

            {/* Floating text snippets */}
            <div className="nb-hero-deco" aria-hidden="true">
              {HERO_TEXTS.map(({ t, s, sm = true }) => (
                <span key={t} className={sm ? 'nb-hero-text' : 'nb-hero-text hide-sm'} style={s}>{t}</span>
              ))}
            </div>

            {/* Hero text */}
            <div className="nb-hero-inner">
              <h1 className="nb-hero-title" translate="no">CODECOMP</h1>
              <p className="nb-hero-lead">Resuelve ejercicios, envía tu código y recibe el veredicto al instante. Una plataforma hecha para entrenar programación competitiva sin salir del editor.</p>

              <div className="nb-hero-actions">
                <button type="button" onClick={openLogin} className="nb-hero-btn-white">Empieza ahora <span className="nb-mono">→</span></button>
                <button type="button" onClick={openLogin} className="nb-hero-btn-blue">Ver retos</button>
                <img src="/cat-pixel.png" alt="" width="512" height="512" className="nb-hero-cat nb-cat-float" />
              </div>

              {/* Terminal */}
              <div className="nb-terminal" translate="no">
                <span>$</span>
                <span>codecomp run --lang cpp --test all</span>
                <span className="nb-terminal-caret"></span>
              </div>

              {/* Stats */}
              <div className="nb-stats">
                {HERO_STATS.map(s => (
                  <div key={s.label} className="nb-stat">
                    <div className="nb-stat-label">{s.label}</div>
                    <div className="nb-stat-value">{s.value}</div>
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
              <span className="nb-lead-kicker">Editor multilenguaje</span>
              <h2 className="nb-lead-title">{LENGUAJES.length} lenguajes</h2>
              <p className="nb-lead-text">Escoges un ejercicio y lo resuelves en el lenguaje que domines. Cada uno abre con su plantilla lista: la estructura base ya está escrita y solo te queda resolver.</p>
            </div>
            <div className="nb-lead-langs">
              {LENGUAJES.map(lang => (
                <span key={lang.id} className="nb-lead-lang" translate="no">{lang.nombre}</span>
              ))}
            </div>
          </div>

          {/* Tres razones */}
          <div className="nb-grid">
            <div className="nb-card is-pad">
              <FeatureIcon>!</FeatureIcon>
              <h3 className="nb-card-title">Respuesta inmediata</h3>
              <p className="nb-card-text">Cada envío se compara con los casos de prueba del ejercicio y te dice exactamente qué pasó: qué caso falló, el tiempo y la salida obtenida.</p>
              <div className="nb-meter"><div></div></div>
            </div>

            <div className="nb-card is-pad">
              <FeatureIcon>//</FeatureIcon>
              <h3 className="nb-card-title">Ruta por dificultad</h3>
              <p className="nb-card-text">Los ejercicios están agrupados por categoría y nivel, así siempre sabes qué sigue en vez de saltar de un tema a otro sin orden.</p>
              <div className="nb-chips is-tight">
                {['Básico','Intermedio','Avanzado'].map(t => (
                  <span key={t} className="nb-chip">{t}</span>
                ))}
              </div>
            </div>

            <div className="nb-card is-pad">
              <FeatureIcon>++</FeatureIcon>
              <h3 className="nb-card-title">Progreso que se queda</h3>
              <p className="nb-card-text">Tu historial de envíos, los ejercicios resueltos y los que marcaste como favoritos siguen ahí cada vez que vuelves a entrar.</p>
            </div>
          </div>
        </section>

        {/* ── 02 Herramientas ── */}
        <section id="herramientas" className="nb-sec nb-sec-tight">
          <SectionTag n="02" label="Herramientas" />
          <h2 className="nb-sec-title is-tools">Herramientas pensadas para ganar</h2>
          <div className="nb-grid is-wide">
            <div className="nb-card is-pad is-col">
              <FeatureIcon>&gt;_</FeatureIcon>
              <h3 className="nb-card-title is-tool">Editor con jueza integrada</h3>
              <p className="nb-card-text is-grow">Escribe, ejecuta y envía desde la misma pantalla. La jueza corre tu código contra los casos de prueba y devuelve el veredicto.</p>
              <SpecSheet rows={[
                { label:'Ejecución',       value:'Automática' },
                { label:'Casos de prueba', value:'Incluidos' },
                { label:'Veredicto',       value:'Al instante' },
              ]} />
            </div>

            <div className="nb-card is-pad is-col">
              <FeatureIcon>#1</FeatureIcon>
              <h3 className="nb-card-title is-tool">Torneos y grupos</h3>
              <p className="nb-card-text is-grow">Compite contra otros en torneos con tiempo límite o entrena en grupo con retos compartidos y tabla de posiciones.</p>
              <SpecSheet rows={[
                { label:'Modalidad', value:'Torneo o grupo' },
                { label:'Duración',  value:'Configurable' },
                { label:'Ranking',   value:'En vivo' },
              ]} />
            </div>

            <div className="nb-card is-pad is-col">
              <FeatureIcon>[]</FeatureIcon>
              <h3 className="nb-card-title is-tool">Biblioteca de ejercicios</h3>
              <p className="nb-card-text is-grow">Un catálogo organizado por tema para encontrar rápido qué practicar, con favoritos para volver a lo que te costó resolver.</p>
              <div className="nb-chips">
                {['Algoritmos','Estructuras','Grafos','DP','Matrices','Recursividad'].map(t => (
                  <span key={t} className="nb-chip">{t}</span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── 03 Noticias ── */}
        <section id="noticias" className="nb-sec nb-sec-tight">
          <SectionTag n="03" label="Noticias" />
          <h2 className="nb-sec-title is-news">Lo último de la plataforma</h2>
          <div className="nb-grid">
            {NOTICIAS.map(n => (
              <article key={n.titulo} className="nb-card is-col nb-news">
                <NoticiaImagen src={n.imagen} alt={n.alt} foco={n.foco} />
                <div className="nb-news-body">
                  <div className="nb-news-meta">
                    <span className="nb-chip is-tag">{n.etiqueta}</span>
                    <span className="nb-news-date">{n.fecha}</span>
                  </div>
                  <h3 className="nb-card-title is-news">{n.titulo}</h3>
                  <p className="nb-card-text">{n.texto}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* ── 04 FAQ ── */}
        <section id="preguntas" className="nb-sec nb-sec-tight is-narrow">
          <div className="nb-faq-head">
            <span className="nb-sectag-label">04 — Preguntas frecuentes</span>
            <h2 className="nb-sec-title is-faq">Todo lo que necesitas saber</h2>
          </div>
          <div className="nb-faq-list">
            {FAQS.map((faq, i) => {
              const open = openFaq === i;
              return (
                <div key={faq.q} className="nb-faq-item">
                  <button
                    type="button"
                    className="nb-faq-q"
                    onClick={() => setOpenFaq(open ? null : i)}
                    aria-expanded={open}
                    aria-controls={`faq-${i}`}
                  >
                    <span>{faq.q}</span>
                    <span className="nb-faq-mark" aria-hidden="true">{open ? '−' : '+'}</span>
                  </button>
                  {/* inert: cerrada, la respuesta no se tabula ni se lee */}
                  <div id={`faq-${i}`} className={`nb-faq-body${open ? ' is-open' : ''}`} inert={!open}>
                    <div>
                      <p className="nb-faq-a">{faq.a}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Footer ── */}
        <footer className="nb-foot">
          <div className="nb-foot-top">
            <div className="nb-foot-brand">
              <img className="nb-footer-ufps" src={logoUfps} alt="UFPS Ocaña" width="500" height="500" loading="lazy" />
              <span className="nb-foot-name" translate="no">CODECOMP</span>
            </div>
            <div className="nb-foot-links">
              {NAV_LINKS.map(({ label, id }) => (
                <button key={id} type="button" className="nb-footer-link nb-footer-btn" onClick={() => scrollToSection(id)}>{label}</button>
              ))}
            </div>
          </div>
          <div className="nb-foot-bottom">
            <p className="nb-foot-copy">© 2026 CODECOMP</p>
            <Link to="/register" className="nb-footer-link nb-foot-small">Crear cuenta →</Link>
          </div>
        </footer>

      </div>

      <LoginModal open={loginOpen} onClose={closeLogin} topOffset={navH} />
    </>
  );
};

export default HomePage;
