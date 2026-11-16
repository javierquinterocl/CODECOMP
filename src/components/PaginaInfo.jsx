import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FLOTANTES } from '../scripts/flotantes';

/** Banda azul con la cuadrícula, código flotando y el gato; la comparten la Guía y la Política. */
export const HeroInfo = ({ kicker, titulo, intro }) => (
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
);

/**
 * Página pública de lectura (Política de datos): cabecera del inicio, banda azul con la
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

      <HeroInfo kicker={kicker} titulo={titulo} intro={intro} />

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

/** Sección con ancla para el índice; el número lo pone el CSS (contador) o `numero` si se pagina. */
export const SeccionInfo = ({ id, titulo, numero, tituloRef, children }) => (
  <section id={id} className="nb-info-sec" aria-labelledby={`${id}-titulo`}>
    <h2
      id={`${id}-titulo`}
      ref={tituloRef}
      tabIndex={tituloRef ? -1 : undefined}
      data-num={numero ? String(numero).padStart(2, '0') : undefined}
    >
      {titulo}
    </h2>
    {children}
  </section>
);

export default PaginaInfo;
