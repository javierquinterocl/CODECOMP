import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  CATEGORIAS,
  TOTAL_PROBLEMAS,
  buscarCategoria,
  ejerciciosDeCategoria,
  NIVELES,
  problemaPerteneceCategoria,
} from '../scripts/problemsData';
import { getAllProblems } from '../scripts/problemsApi';
import { useFavoritos } from '../scripts/useFavoritos';
import { StarIcon, NivelBarra } from '../components/ProblemBits';

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
  const [problemas, setProblemas] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (import.meta.env.VITE_ENABLE_ADAPTIVE !== 'true') return;
    setCargando(true);
    const load = getAllProblems().then((todos) => (
      slug === 'todos' ? todos : todos.filter((problema) => problemaPerteneceCategoria(problema, slug))
    ));
    load.then(setProblemas).catch((e) => setError(e.message)).finally(() => setCargando(false));
  }, [slug]);

  const categoria = slug === 'todos' ? TODOS : buscarCategoria(slug);
  const ejerciciosLocales = useMemo(() => ejerciciosDeCategoria(slug), [slug]);
  const ejercicios = import.meta.env.VITE_ENABLE_ADAPTIVE === 'true' ? problemas : ejerciciosLocales;
  const visibles = soloFavoritos
    ? ejercicios.filter((e) => esFavorito(e.numero))
    : ejercicios;

  if (!categoria && import.meta.env.VITE_ENABLE_ADAPTIVE !== 'true') {
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
          <div className="nb-pb-cat-count-value">{ejercicios.length}</div>
          <div className="nb-pb-cat-count-label">Problemas</div>
        </div>
      </div>

      {ejercicios.length > 0 && (
        <div className="nb-pb-listbar">
          <span className="nb-pb-listbar-title">Ejercicios</span>
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

        {ejercicios.length === 0 && (
          <div className="nb-pb-empty">
            <h3 className="nb-pb-empty-title">Todavía sin ejercicios</h3>
            <p className="nb-dash-body-text">
              Esta categoría aún no tiene problemas cargados. Mientras tanto,
              empieza por <Link to="/dashboard/problemas/principiante">Principiante</Link>.
            </p>
          </div>
        )}

        {ejercicios.length > 0 && visibles.length === 0 && (
          <div className="nb-pb-empty">
            <h3 className="nb-pb-empty-title">Sin favoritos aquí</h3>
            <p className="nb-dash-body-text">
              Marca un ejercicio con la estrella para verlo en este filtro.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProblemsCategoryPage;
