import { useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FLOTANTES } from '../scripts/flotantes';

/** Página 404: la banda viva de las páginas públicas a pantalla completa. Texto borrador. */
const NotFoundPage = () => {
  const navigate = useNavigate();
  const tituloRef = useRef(null);

  useEffect(() => {
    const anterior = document.title;
    document.title = 'Página no encontrada · CODECOMP';
    tituloRef.current?.focus();
    return () => { document.title = anterior; };
  }, []);

  const volver = () => (window.history.length > 1 ? navigate(-1) : navigate('/'));

  return (
    <div className="nb-info nb-404">
      <nav className="nb-nav">
        <div className="nb-nav-inner">
          <Link to="/" className="nb-brand" translate="no">CODECOMP</Link>
        </div>
      </nav>

      <main className="nb-info-hero nb-404-hero">
        <div className="nb-hero-grid" />
        <div className="nb-info-flota" aria-hidden="true">
          {FLOTANTES.map((f) => (
            <span key={f.t} className={`nb-hero-text${f.sm === false ? ' nb-info-flota-ancha' : ''}`} style={f.s}>{f.t}</span>
          ))}
        </div>
        <div className="nb-info-hero-inner">
          <div className="nb-info-kicker">Veredicto: Not Found</div>
          <h1 className="nb-info-titulo nb-404-titulo" tabIndex={-1} ref={tituloRef}>
            <span className="nb-404-num">404</span>
            Página no encontrada
          </h1>
          <p className="nb-info-intro">
            Esta dirección no existe o cambió de lugar. Revisa el enlace o vuelve a un sitio conocido.
          </p>
          <div className="nb-404-acciones">
            <Link to="/" className="nb-btn-white">Ir al inicio</Link>
            <button type="button" className="nb-btn-white" onClick={volver}>← Volver</button>
          </div>
        </div>
        <img className="nb-info-gato nb-cat-float" src="/cat-pixel.png" alt="" width="512" height="512" />
      </main>
    </div>
  );
};

export default NotFoundPage;
