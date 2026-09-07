import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CATEGORIAS as CATEGORIAS_LOCALES, problemaPerteneceCategoria, normalizarTexto } from '../scripts/problemsData';
import { getAllProblems } from '../scripts/problemsApi';

const SearchIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="square">
    <circle cx="11" cy="11" r="7" />
    <path d="M16.5 16.5 21 21" />
  </svg>
);

const ADAPTIVO = import.meta.env.VITE_ENABLE_ADAPTIVE === 'true';

const CategoryCard = ({ categoria }) => (
  <Link
    to={`/dashboard/problemas/${categoria.slug}`}
    className="nb-pb-card"
    style={{ '--cat-bg': categoria.bg, '--cat-ink': categoria.ink }}
  >
    <span className="nb-pb-ghost" aria-hidden="true">{categoria.n}</span>

    <div className="nb-pb-card-head">
      <span className="nb-pb-badge">{categoria.n}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <h3 className="nb-pb-card-title">{categoria.titulo}</h3>
        <p className="nb-pb-card-topics">{categoria.temas}</p>
      </div>
    </div>

    <div className="nb-pb-card-foot">
      <span className="nb-pb-count">
        {categoria.total === 0
          ? 'Próximamente'
          : `${categoria.total} ${categoria.total === 1 ? 'problema' : 'problemas'}`}
      </span>
      <span className="nb-pb-go" aria-hidden="true">→</span>
    </div>
  </Link>
);

const ProblemsPage = () => {
  const [busqueda, setBusqueda] = useState('');
  const [problemas, setProblemas] = useState([]);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(ADAPTIVO);

  useEffect(() => {
    if (!ADAPTIVO) return undefined;
    let vigente = true;
    getAllProblems()
      .then((datos) => { if (vigente) setProblemas(datos); })
      .catch((e) => { if (vigente) setError(e.message); })
      .finally(() => { if (vigente) setCargando(false); });
    return () => { vigente = false; };
  }, []);

  const categorias = useMemo(() => {
    if (!ADAPTIVO) return CATEGORIAS_LOCALES;
    return CATEGORIAS_LOCALES
      .map((categoria) => ({
        ...categoria,
        total: problemas.filter((problema) => problemaPerteneceCategoria(problema, categoria.slug)).length,
      }))
      .filter((categoria) => categoria.total > 0)
      // Las categorias vacias se esconden, asi que el numero del catalogo
      // dejaria huecos (…8, 10). Se renumera sobre lo que de verdad se ve.
      .map((categoria, i) => ({ ...categoria, n: i + 1 }));
  }, [problemas]);

  const visibles = useMemo(() => {
    const termino = normalizarTexto(busqueda.trim());
    if (!termino) return categorias;
    return categorias.filter((c) =>
      normalizarTexto(`${c.titulo} ${c.temas} ${c.etiquetas.join(' ')}`).includes(termino),
    );
  }, [busqueda, categorias]);

  return (
    <div className="nb-dash-inner">

      {/* ── Encabezado del módulo ── */}
      <div className="nb-dash-hero nb-pb-hero">
        <div className="nb-dash-hero-deco" aria-hidden="true">
          <div className="nb-dash-code-float" style={{ right: '3%', top: '14%', width: 'clamp(120px,10vw,225px)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.22)', padding: '5px 8px' }}>
              <span style={{ width: 7, height: 7, background: 'rgba(255,255,255,0.7)', display: 'block' }} />
              <span style={{ width: 7, height: 7, background: 'rgba(255,255,255,0.4)', display: 'block' }} />
            </div>
            <pre>
              <span style={{ color: 'rgba(255,255,255,0.95)' }}>sort</span>{'(v.begin(),\n     v.end());\n'}
              <span style={{ color: 'rgba(255,255,255,0.95)' }}>while</span>{' (l <= r) {\n  m = (l + r) / 2;\n}'}
            </pre>
          </div>
          <span className="nb-dash-float-text" style={{ left: '2%', bottom: '8%', fontSize: 'clamp(9px,0.7vw,16px)', color: 'rgba(255,255,255,0.26)' }}>O(n log n)</span>
        </div>

        <div className="nb-pb-hero-main">
          <div className="nb-dash-hero-kicker">Módulo</div>
          <h1 className="nb-dash-hero-title">Problemas</h1>
          <p className="nb-dash-hero-text">
            Nuestro repositorio de práctica, ordenado por tema. Escoge una categoría
            y avanza a tu ritmo desde lo básico hasta lo avanzado.
          </p>
        </div>

        <div className="nb-pb-hero-stats">
          <div className="nb-pb-hstat">
            <div className="nb-pb-hstat-label">Problemas</div>
            <div className="nb-pb-hstat-value">{ADAPTIVO ? problemas.length : CATEGORIAS_LOCALES.reduce((total, c) => total + c.total, 0)}</div>
          </div>
          <div className="nb-pb-hstat">
            <div className="nb-pb-hstat-label">Categorías</div>
            <div className="nb-pb-hstat-value">{categorias.length}</div>
          </div>
          <div className="nb-pb-hstat">
            <div className="nb-pb-hstat-label">Resueltos</div>
            <div className="nb-pb-hstat-value">0</div>
          </div>
        </div>
      </div>

      {/* ── Búsqueda ── */}
      <div className="nb-pb-bar">
        <div className="nb-pb-search">
          <SearchIcon />
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por tema: grafos, dp, cadenas..."
            aria-label="Buscar categoría de problemas"
          />
          {busqueda && (
            <button type="button" className="nb-pb-clear" onClick={() => setBusqueda('')} aria-label="Limpiar búsqueda">
              ✕
            </button>
          )}
        </div>
        <Link to="/dashboard/problemas/todos" className="nb-pb-all">
          Ver todos<span className="nb-mono">↗</span>
        </Link>
      </div>

      {/* ── Rejilla de categorías ── */}
      <div className="nb-pb-grid">
        {cargando && <div className="nb-pb-empty"><p className="nb-dash-body-text">Cargando problemas…</p></div>}
        {visibles.map((c) => <CategoryCard key={c.slug} categoria={c} />)}

        {!cargando && !error && visibles.length === 0 && (
          <div className="nb-pb-empty">
            <h3 className="nb-pb-empty-title">Sin coincidencias</h3>
            <p className="nb-dash-body-text">
              Ninguna categoría corresponde a «{busqueda}». Prueba con otro tema.
            </p>
          </div>
        )}
      </div>
      {error && <div className="nb-pb-empty"><p className="nb-dash-body-text">{error}</p></div>}
    </div>
  );
};

export default ProblemsPage;
