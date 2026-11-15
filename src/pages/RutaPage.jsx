import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useEntrenamiento } from '../scripts/useEntrenamiento';
import { META_TEMA, rutaDeTemas } from '../scripts/entrenamiento';
import { useIdioma } from '../scripts/useIdioma';
import { EsqPagina } from '../components/Esqueleto';

// Ruta de entrenamiento por temas. Textos borrador: los decide el equipo.

const ESTADOS = {
  dominado: 'Dominado',
  'en-curso': 'En curso',
  recomendado: 'Empieza aquí',
  'por-empezar': 'Por empezar',
};

const RutaPage = () => {
  const { user } = useAuth();
  const { idioma } = useIdioma();
  const { datos, catalogo, error } = useEntrenamiento(user);
  const ruta = useMemo(
    () => (datos && catalogo ? rutaDeTemas(catalogo, datos.resueltos, datos.nivel) : null),
    [datos, catalogo],
  );

  if (error) {
    return <div className="nb-dash-inner"><div className="nb-pb-empty"><p className="nb-pb-empty-title">{error}</p></div></div>;
  }
  if (!ruta) return <EsqPagina forma="lista" aviso="Cargando tu ruta…" />;

  const dominados = ruta.filter((t) => t.estado === 'dominado').length;
  const titulo = (p) => (idioma === 'es' && p.tituloEs ? p.tituloEs : p.titulo);

  return (
    <div className="nb-dash-inner">
      <div className="nb-dash-card nb-fd-hero nb-ruta-hero">
        <div className="nb-fd-hero-main">
          <div className="nb-fd-kicker">Ruta de entrenamiento</div>
          <h1 className="nb-fd-title">Un tema a la vez, de lo básico a grafos</h1>
          <p className="nb-fd-hero-text">
            Domina un tema resolviendo {META_TEMA} de sus problemas. Te proponemos los que están a tu
            altura: ni tan fáciles que aburran ni tan difíciles que frustren.
          </p>
        </div>
        <div className="nb-fd-hero-stats">
          <div className="nb-pb-hstat">
            <div className="nb-pb-hstat-label">Temas dominados</div>
            <div className="nb-pb-hstat-value">{dominados}/{ruta.length}</div>
          </div>
          <div className="nb-pb-hstat" title="Problemas aceptados sin haber pedido ninguna pista">
            <div className="nb-pb-hstat-label">Por tu cuenta</div>
            <div className="nb-pb-hstat-value">{datos.resueltosSinPista}</div>
            <div className="nb-pb-hstat-sub">resueltos sin pistas</div>
          </div>
          <div className="nb-pb-hstat">
            <div className="nb-pb-hstat-label">Tu nivel</div>
            <div className="nb-pb-hstat-value">{Math.round(datos.nivel) || '—'}</div>
          </div>
        </div>
      </div>

      <ol className="nb-ruta">
        {ruta.map((t, i) => (
          <li key={t.slug} className={`nb-ruta-paso is-${t.estado}${t.recomendado ? ' is-recomendado' : ''}`}>
            <span className="nb-ruta-num" aria-hidden="true">{t.estado === 'dominado' ? '✓' : String(i + 1).padStart(2, '0')}</span>
            <section className="nb-dash-card nb-ruta-tarjeta" aria-labelledby={`ruta-${t.slug}`}>
              <div className="nb-ruta-cabeza">
                <div className="nb-ruta-titulos">
                  <h2 id={`ruta-${t.slug}`} className="nb-ruta-titulo">{t.titulo}</h2>
                  <p className="nb-ruta-idea">{t.idea}</p>
                </div>
                <span className="nb-ruta-estado">{t.recomendado && t.estado === 'en-curso' ? 'Sigue aquí' : ESTADOS[t.estado]}</span>
              </div>
              <div className="nb-ruta-avance">
                <span className="nb-ruta-barra" style={{ '--avance': `${(t.resueltos / META_TEMA) * 100}%` }} aria-hidden="true" />
                <span className="nb-ruta-cifra">{t.resueltos}/{META_TEMA} resueltos · {t.total} en el tema</span>
              </div>
              {t.estado !== 'dominado' && t.propuestos.length > 0 && (
                <ul className="nb-ruta-problemas">
                  {t.propuestos.map((p) => (
                    <li key={p.numero}>
                      <Link to={`/dashboard/problemas/${t.slug}/${p.numero}`} className="nb-ruta-problema">
                        <span className="nb-ruta-problema-num">#{p.numero}</span>
                        <span className="nb-ruta-problema-titulo">{titulo(p)}</span>
                        <span className="nb-ruta-problema-nivel">{p.dificultadRating}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              {t.estado === 'dominado' && (
                <Link to={`/dashboard/problemas/${t.slug}`} className="nb-ruta-mas">Seguir practicando {t.titulo} →</Link>
              )}
            </section>
          </li>
        ))}
      </ol>
    </div>
  );
};

export default RutaPage;
