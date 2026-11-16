import { Link } from 'react-router-dom';
import { LockIcon } from './AppIcons';

/** Pantalla de un nivel o tema todavía cerrado: dice por qué y cuánto falta, con salida. */
const NivelBloqueado = ({ titulo, motivo, hechos, meta, volverA, textoVolver = '← Volver' }) => (
  <div className="nb-dash-inner">
    <Link to={volverA} className="nb-pb-back">{textoVolver}</Link>
    <div className="nb-pb-empty nb-bloqueo" role="status">
      <span className="nb-bloqueo-icono" aria-hidden="true"><LockIcon /></span>
      <h2 className="nb-pb-empty-title">{titulo}</h2>
      <p className="nb-dash-body-text">{motivo}</p>
      {meta > 0 && (
        <div className="nb-bloqueo-avance" role="progressbar" aria-valuemin={0} aria-valuemax={meta} aria-valuenow={Math.min(hechos, meta)} aria-label={`${hechos} de ${meta}`}>
          <span style={{ '--avance': `${Math.min(100, (hechos / meta) * 100)}%` }} />
          <small>{hechos} de {meta}</small>
        </div>
      )}
    </div>
  </div>
);

export default NivelBloqueado;
