import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

/**
 * Página pública de lectura (Guía, Política de datos): cabecera con volver, índice de anclas y
 * secciones planas para que se lea completa y la búsqueda del navegador encuentre todo.
 */
const PaginaInfo = ({ kicker, titulo, intro, secciones, children }) => {
  const navigate = useNavigate();
  useEffect(() => { document.title = `${titulo} · CODECOMP`; }, [titulo]);
  const volver = () => (window.history.length > 1 ? navigate(-1) : navigate('/dashboard'));

  return (
    <div className="nb-info">
      <header className="nb-info-head">
        <Link to="/" className="nb-info-marca" translate="no">CODECOMP</Link>
        <button type="button" className="nb-btn-white nb-info-volver" onClick={volver}>← Volver</button>
      </header>
      <main className="nb-info-main">
        <div className="nb-info-kicker">{kicker}</div>
        <h1 className="nb-info-titulo">{titulo}</h1>
        {intro && <p className="nb-info-intro">{intro}</p>}
        <nav className="nb-info-indice" aria-label="Contenido">
          <ol>
            {secciones.map((s) => <li key={s.id}><a href={`#${s.id}`}>{s.titulo}</a></li>)}
          </ol>
        </nav>
        {children}
      </main>
    </div>
  );
};

/** Sección con ancla para el índice. */
export const SeccionInfo = ({ id, titulo, children }) => (
  <section id={id} className="nb-info-sec" aria-labelledby={`${id}-titulo`}>
    <h2 id={`${id}-titulo`}>{titulo}</h2>
    {children}
  </section>
);

export default PaginaInfo;
