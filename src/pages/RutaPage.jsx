import { useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useEntrenamiento } from '../scripts/useEntrenamiento';
import { META_TEMA, rutaDeTemas } from '../scripts/entrenamiento';
import { useIdioma } from '../scripts/useIdioma';
import { EsqPagina } from '../components/Esqueleto';
import GrafoRuta from '../components/GrafoRuta';

// Ruta de entrenamiento por temas. Textos borrador: los decide el equipo.

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

      <GrafoRuta ruta={ruta} titulo={titulo} />
    </div>
  );
};

export default RutaPage;
