import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  CATEGORIAS,
  TOTAL_PROBLEMAS,
  buscarCategoria,
  ejerciciosDeCategoria,
  NIVELES,
  problemaPerteneceCategoria,
  normalizarTexto,
} from '../scripts/problemsData';
import { getAllProblems } from '../scripts/problemsApi';
import { useFavoritos } from '../scripts/useFavoritos';
import { StarIcon, NivelBarra } from '../components/ProblemBits';

const ADAPTIVO = import.meta.env.VITE_ENABLE_ADAPTIVE === 'true';

const SearchIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="square">
    <circle cx="11" cy="11" r="7" />
    <path d="M16.5 16.5 21 21" />
  </svg>
);

/** "Ver todos" reutiliza esta misma vista con los colores del panel. */
const TODOS = {
  slug: 'todos',
  titulo: 'Todos los problemas',
  temas: 'El repositorio completo en un solo lugar, sin filtrar por tema.',
  etiquetas: CATEGORIAS.map((c) => c.titulo),
  total: TOTAL_PROBLEMAS,
  bg: 'var(--nb-blue)',
  ink: '#fff',
};

const ProblemRow = ({ ejercicio, categoriaSlug, esFavorito, alternar }) => {
  const marcado = esFavorito(ejercicio.numero);

  return (
    <div className="nb-pb-row">
      <span className="nb-pb-row-num">{ejercicio.numero}</span>

      <div className="nb-pb-row-main">
        {/* El enlace se estira sobre toda la fila con ::after; el botón de
            favorito se queda encima gracias a su z-index. */}
        <Link to={`/dashboard/problemas/${categoriaSlug}/${ejercicio.numero}`} className="nb-pb-row-link">
          {ejercicio.titulo}
        </Link>
        <div className="nb-pb-row-sub">{ejercicio.resumen}</div>
      </div>

      <div className="nb-pb-row-nivel">
        <span className="nb-pb-row-nivel-label">{NIVELES[ejercicio.nivel]}</span>
        <NivelBarra nivel={ejercicio.nivel} />
      </div>

      <button
        type="button"
        className={`nb-pb-fav${marcado ? ' is-on' : ''}`}
        onClick={() => alternar(ejercicio.numero)}
        aria-pressed={marcado}
        title={marcado ? 'Quitar de favoritos' : 'Marcar como favorito'}
        aria-label={marcado ? `Quitar ${ejercicio.titulo} de favoritos` : `Marcar ${ejercicio.titulo} como favorito`}
      >
        <StarIcon relleno={marcado} />
      </button>

      <span className="nb-pb-row-go" aria-hidden="true">→</span>
    </div>
  );
};

const ProblemsCategoryPage = () => {
  const { slug } = useParams();
  const { esFavorito, alternar } = useFavoritos();
  const [soloFavoritos, setSoloFavoritos] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [problemas, setProblemas] = useState([]);
  const [cargando, setCargando] = useState(ADAPTIVO);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!ADAPTIVO) return undefined;
    // `vigente` evita que una carga anterior pinte datos de otra categoria
    // si se navega rapido entre ellas.
    let vigente = true;
    getAllProblems()
      .then((todos) => {
        if (!vigente) return;
        setProblemas(slug === 'todos'
          ? todos
          : todos.filter((problema) => problemaPerteneceCategoria(problema, slug)));
      })
      .catch((e) => { if (vigente) setError(e.message); })
      .finally(() => { if (vigente) setCargando(false); });
    return () => { vigente = false; };
  }, [slug]);

  const categoria = slug === 'todos' ? TODOS : buscarCategoria(slug);
  const ejerciciosLocales = useMemo(() => ejerciciosDeCategoria(slug), [slug]);
  const ejercicios = ADAPTIVO ? problemas : ejerciciosLocales;
  
  const visibles = useMemo(() => {
    const termino = normalizarTexto(busqueda.trim());
    return ejercicios.filter((e) => {
      if (soloFavoritos && !esFavorito(e.numero)) return false;
      if (!termino) return true;
      return normalizarTexto(`${e.numero} ${e.titulo} ${e.resumen || ''}`).includes(termino);
    });
  }, [ejercicios, busqueda, soloFavoritos, esFavorito]);

  if (!categoria && !ADAPTIVO) {
    return (
      <div className="nb-dash-inner">
        <Link to="/dashboard/problemas" className="nb-pb-back">← Volver a problemas</Link>
        <div className="nb-pb-empty">
          <h3 className="nb-pb-empty-title">Categoría no encontrada</h3>
          <p className="nb-dash-body-text">La categoría «{slug}» no existe en el catálogo.</p>
        </div>
      </div>
    );
  }

  const encabezado = categoria || { titulo: slug, temas: `Problemas etiquetados como ${slug}.`, etiquetas: [slug], total: ejercicios.length, bg: 'var(--nb-blue)', ink: '#fff' };
  return (
    <div className="nb-dash-inner">
      <Link to="/dashboard/problemas" className="nb-pb-back">← Volver a problemas</Link>

      <div className="nb-pb-cat-head" style={{ '--cat-bg': encabezado.bg, '--cat-ink': encabezado.ink }}>
        {encabezado.n && <span className="nb-pb-ghost" aria-hidden="true">{encabezado.n}</span>}

        <div className="nb-pb-cat-main">
          <h1 className="nb-pb-cat-title">{encabezado.titulo}</h1>
          <p className="nb-pb-cat-text">{encabezado.temas}</p>
          <div className="nb-pb-tags">
            {encabezado.etiquetas.map((e) => <span key={e} className="nb-pb-tag">{e}</span>)}
          </div>
        </div>

        <div className="nb-pb-cat-count">
          <div className="nb-pb-cat-count-value">{cargando ? '…' : ejercicios.length}</div>
          <div className="nb-pb-cat-count-label">Problemas</div>
        </div>
      </div>

      {!cargando && ejercicios.length > 0 && (
        <div className="nb-pb-listbar">
          <span className="nb-pb-listbar-title">Ejercicios</span>

          <div className="nb-pb-search nb-pb-search-inline">
            <SearchIcon />
            <input
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por número o título..."
              aria-label="Buscar un ejercicio de esta categoría"
            />
            {busqueda && (
              <button type="button" className="nb-pb-clear" onClick={() => setBusqueda('')} aria-label="Limpiar búsqueda">
                ✕
              </button>
            )}
          </div>

          <button
            type="button"
            className={`nb-pb-filtro${soloFavoritos ? ' is-on' : ''}`}
            onClick={() => setSoloFavoritos((v) => !v)}
            aria-pressed={soloFavoritos}
          >
            <StarIcon relleno={soloFavoritos} />
            Solo favoritos
          </button>
        </div>
      )}

      <div className="nb-pb-list">
        {cargando && <div className="nb-pb-empty"><p className="nb-dash-body-text">Cargando problemas...</p></div>}
        {error && <div className="nb-pb-empty"><p className="nb-dash-body-text">{error}</p></div>}
        {visibles.map((e) => (
          <ProblemRow
            key={e.numero}
            ejercicio={e}
            categoriaSlug={slug}
            esFavorito={esFavorito}
            alternar={alternar}
          />
        ))}

        {!cargando && !error && ejercicios.length === 0 && (
          <div className="nb-pb-empty">
            <h3 className="nb-pb-empty-title">Todavía sin ejercicios</h3>
            <p className="nb-dash-body-text">
              Esta categoría aún no tiene problemas cargados. Mientras tanto,
              empieza por <Link to="/dashboard/problemas/principiante">Principiante</Link>.
            </p>
          </div>
        )}

        {!cargando && ejercicios.length > 0 && visibles.length === 0 && (
          <div className="nb-pb-empty">
            <h3 className="nb-pb-empty-title">
              {busqueda ? 'Sin coincidencias' : 'Sin favoritos aquí'}
            </h3>
            <p className="nb-dash-body-text">
              {busqueda
                ? `Ningún ejercicio de esta lista corresponde a «${busqueda}».`
                : 'Marca un ejercicio con la estrella para verlo en este filtro.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProblemsCategoryPage;
