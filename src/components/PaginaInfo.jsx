import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

// Textos de programación competitiva que flotan en la banda, como en el inicio. La animación la
// pone .nb-hero-text con --nb-float y --nb-dur (se apaga con prefers-reduced-motion).
const FLOTANTES = [
  { t: 'AC ✓', s: { left: '6%', top: '18%', '--nb-float': 'om-float-a', '--nb-dur': '9s', fontSize: 'clamp(12px,1.3vw,20px)' } },
  { t: 'O(n log n)', s: { right: '7%', top: '14%', '--nb-float': 'om-float-c', '--nb-dur': '10s', fontSize: 'clamp(11px,1.1vw,18px)' } },
  { t: 'dp[i][j]', s: { left: '14%', bottom: '14%', '--nb-float': 'om-float-b', '--nb-dur': '8.6s', fontSize: 'clamp(11px,1.05vw,17px)' } },
  { t: 'while (t--)', s: { right: '16%', bottom: '18%', '--nb-float': 'om-float-a', '--nb-dur': '9.4s', fontSize: 'clamp(10px,0.95vw,15px)' } },
  { t: '#include <bits/stdc++.h>', sm: false, s: { left: '30%', top: '7%', '--nb-float': 'om-float-c', '--nb-dur': '11s', fontSize: 'clamp(9px,0.85vw,14px)' } },
  { t: 'n ≤ 10⁵', sm: false, s: { right: '30%', bottom: '8%', '--nb-float': 'om-float-b', '--nb-dur': '8s', fontSize: 'clamp(10px,0.95vw,15px)' } },
  { t: 'Leer n', sm: false, s: { left: '3%', top: '58%', '--nb-float': 'om-float-c', '--nb-dur': '9.8s', fontSize: 'clamp(10px,0.9vw,14px)' } },
  { t: '{ }', s: { right: '3%', top: '52%', '--nb-float': 'om-float-a', '--nb-dur': '8.4s', fontSize: 'clamp(16px,1.9vw,30px)' } },
];

/**
 * Página pública de lectura (Guía, Política de datos): cabecera del inicio, banda azul con la
 * cuadrícula y código flotando, índice fijo al costado y secciones numeradas, planas para que se
 * lean completas y la búsqueda del navegador encuentre todo.
 */
const PaginaInfo = ({ kicker, titulo, intro, secciones, children }) => {
  const navigate = useNavigate();
  useEffect(() => { document.title = `${titulo} · CODECOMP`; }, [titulo]);
  const volver = () => (window.history.length > 1 ? navigate(-1) : navigate('/dashboard'));

  return (
    <div className="nb-info">
      <nav className="nb-nav">
        <div className="nb-nav-inner">
          <Link to="/" className="nb-brand" translate="no">CODECOMP</Link>
          <div className="nb-nav-actions">
            <button type="button" className="nb-btn-white nb-info-volver" onClick={volver}>← Volver</button>
          </div>
        </div>
      </nav>

      <header className="nb-info-hero">
        <div className="nb-hero-grid" />
        <div className="nb-info-flota" aria-hidden="true">
          {FLOTANTES.map((f) => (
            <span key={f.t} className={`nb-hero-text${f.sm === false ? ' nb-info-flota-ancha' : ''}`} style={f.s}>{f.t}</span>
          ))}
        </div>
        <div className="nb-info-hero-inner">
          <div className="nb-info-kicker">{kicker}</div>
          <h1 className="nb-info-titulo">{titulo}</h1>
          {intro && <p className="nb-info-intro">{intro}</p>}
        </div>
        <img className="nb-info-gato nb-cat-float" src="/cat-pixel.png" alt="" width="512" height="512" />
      </header>

      <div className="nb-info-cuerpo">
        <nav className="nb-info-indice" aria-label="Contenido">
          <div className="nb-info-indice-titulo">Contenido</div>
          <ol>
            {secciones.map((s) => <li key={s.id}><a href={`#${s.id}`}>{s.titulo}</a></li>)}
          </ol>
        </nav>
        <main className="nb-info-main">{children}</main>
      </div>
    </div>
  );
};

/** Sección con ancla para el índice; el número lo pone el CSS (contador). */
export const SeccionInfo = ({ id, titulo, children }) => (
  <section id={id} className="nb-info-sec" aria-labelledby={`${id}-titulo`}>
    <h2 id={`${id}-titulo`}>{titulo}</h2>
    {children}
  </section>
);

export default PaginaInfo;
