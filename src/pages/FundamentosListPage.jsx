import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { buscarNivel, temasDeNivel } from '../scripts/fundamentosData';
import { NIVELES, normalizarTexto } from '../scripts/problemsData';
import { NivelBarra } from '../components/ProblemBits';

const SearchIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="square">
    <circle cx="11" cy="11" r="7" />
    <path d="M16.5 16.5 21 21" />
  </svg>
);

const Fila = ({ nivelSlug, ejercicio }) => (
  <div className="nb-pb-row">
    <span className="nb-pb-row-num">{ejercicio.numero}</span>

    <div className="nb-pb-row-main">
      {/* El enlace se estira sobre toda la fila con ::after. */}
      <Link to={`/dashboard/fundamentos/${nivelSlug}/${ejercicio.numero}`} className="nb-pb-row-link">
        {ejercicio.titulo}
      </Link>
      <div className="nb-pb-row-sub">{ejercicio.resumen}</div>
    </div>

    <div className="nb-pb-row-nivel">
      <span className="nb-pb-row-nivel-label">{NIVELES[ejercicio.nivel]}</span>
      <NivelBarra nivel={ejercicio.nivel} />
    </div>

    <span className="nb-pb-row-go" aria-hidden="true">→</span>
  </div>
);

const FundamentosListPage = () => {
  const { nivel: nivelSlug } = useParams();
  const nivel = buscarNivel(nivelSlug);
  const [busqueda, setBusqueda] = useState('');

  const temas = useMemo(() => (nivel ? temasDeNivel(nivel) : []), [nivel]);

  const grupos = useMemo(() => {
    if (!nivel) return [];
    const termino = normalizarTexto(busqueda.trim());
    return temas
      .map((tema) => ({
        tema,
        ejercicios: nivel.ejercicios.filter((e) => e.tema === tema.slug && (!termino
          || normalizarTexto(`${e.numero} ${e.titulo} ${e.resumen} ${tema.titulo}`).includes(termino))),
      }))
      .filter((g) => g.ejercicios.length > 0);
  }, [nivel, temas, busqueda]);

  if (!nivel || nivel.ejercicios.length === 0) {
    return (
      <div className="nb-dash-inner">
        <Link to="/dashboard/fundamentos" className="nb-pb-back">← Volver a fundamentos</Link>
        <div className="nb-pb-empty">
          <h3 className="nb-pb-empty-title">{nivel ? 'Muy pronto' : 'Nivel no encontrado'}</h3>
          <p className="nb-dash-body-text">
            {nivel ? `${nivel.titulo} todavía no tiene ejercicios.` : `No existe el nivel «${nivelSlug}».`}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="nb-dash-inner">
      <Link to="/dashboard/fundamentos" className="nb-pb-back">← Volver a fundamentos</Link>

      <div className="nb-pb-cat-head" style={{ '--cat-bg': nivel.color.bg, '--cat-ink': nivel.color.ink }}>
        <div className="nb-pb-cat-main">
          <h1 className="nb-pb-cat-title">{nivel.titulo}</h1>
          <p className="nb-pb-cat-text">{nivel.texto} Van en orden: cada tema usa lo de los anteriores.</p>
          <div className="nb-pb-tags">
            {temas.map((t) => <span key={t.slug} className="nb-pb-tag">{t.titulo}</span>)}
          </div>
        </div>

        <div className="nb-pb-cat-count">
          <div className="nb-pb-cat-count-value">{nivel.ejercicios.length}</div>
          <div className="nb-pb-cat-count-label">Ejercicios</div>
        </div>
      </div>

      <div className="nb-pb-listbar">
        <span className="nb-pb-listbar-title">Ejercicios</span>

        <div className="nb-pb-search nb-pb-search-inline">
          <SearchIcon />
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por número, título o tema..."
            aria-label={`Buscar un ejercicio de ${nivel.titulo}`}
          />
          {busqueda && (
            <button type="button" className="nb-pb-clear" onClick={() => setBusqueda('')} aria-label="Limpiar búsqueda">
              ✕
            </button>
          )}
        </div>
      </div>

      {grupos.map(({ tema, ejercicios }) => (
        <section key={tema.slug} className="nb-fd-grupo">
          <div className="nb-fd-grupo-head">
            <h2 className="nb-fd-grupo-title">{tema.titulo}</h2>
            <span className="nb-fd-grupo-text">{tema.resumen}</span>
          </div>
          <div className="nb-pb-list">
            {ejercicios.map((e) => <Fila key={e.numero} nivelSlug={nivel.slug} ejercicio={e} />)}
          </div>
        </section>
      ))}

      {grupos.length === 0 && (
        <div className="nb-pb-empty">
          <h3 className="nb-pb-empty-title">Sin coincidencias</h3>
          <p className="nb-dash-body-text">Ningún ejercicio corresponde a «{busqueda}».</p>
        </div>
      )}
    </div>
  );
};

export default FundamentosListPage;
