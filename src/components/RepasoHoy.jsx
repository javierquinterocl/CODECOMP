import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useEntrenamiento } from '../scripts/useEntrenamiento';
import { repasoDeHoy } from '../scripts/entrenamiento';
import { useIdioma } from '../scripts/useIdioma';
import { EsqFilas } from './Esqueleto';

/** Tarjeta del Inicio: hasta 3 problemas de los temas que tocan repasar hoy, con el motivo. */
const RepasoHoy = ({ user }) => {
  const { idioma } = useIdioma();
  const { datos, catalogo, error } = useEntrenamiento(user);
  const repaso = useMemo(
    () => (datos && catalogo ? repasoDeHoy(datos.porTag, datos.resueltos, catalogo, datos.nivel) : null),
    [datos, catalogo],
  );
  if (error) return null;

  return (
    <div className="nb-dash-card nb-dash-pad nb-repaso">
      <div className="nb-dash-sechead">
        <div>
          <div className="nb-dash-badge">Repaso espaciado</div>
          <h2 className="nb-dash-section-title">Tu repaso de hoy</h2>
          <div className="nb-dash-section-sub">Los temas donde más fallas o que hace días no practicas</div>
        </div>
        <Link to="/dashboard/ruta" className="nb-dash-outline">Ver la ruta ↗</Link>
      </div>
      {!repaso && <EsqFilas n={3} aviso="Preparando tu repaso…" />}
      {repaso?.length === 0 && (
        <p className="nb-dash-body-text">
          Nada que repasar por ahora. Sigue avanzando en tu <Link to="/dashboard/ruta">ruta de entrenamiento</Link>.
        </p>
      )}
      {repaso?.length > 0 && (
        <ul className="nb-repaso-lista">
          {repaso.map((r) => (
            <li key={r.slug} className="nb-repaso-item">
              <span className="nb-repaso-tema">{r.titulo}</span>
              <Link to={`/dashboard/problemas/${r.problema.categoria}/${r.problema.numero}`} className="nb-repaso-problema">
                #{r.problema.numero} · {idioma === 'es' && r.problema.tituloEs ? r.problema.tituloEs : r.problema.titulo}
              </Link>
              <span className="nb-repaso-motivo">{r.motivo}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default RepasoHoy;
