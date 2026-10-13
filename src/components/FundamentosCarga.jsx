import { Link } from 'react-router-dom';

/** Lo que muestran las páginas de Fundamentos mientras llegan los ejercicios, o si no llegan. */
const FundamentosCarga = ({ error = '', volverA = '' }) => (
  <div className="nb-dash-inner">
    {volverA && <Link to={volverA} className="nb-pb-back">← Volver</Link>}
    <div className="nb-pb-empty" aria-live="polite">
      {error ? (
        <>
          <h3 className="nb-pb-empty-title">No se pudieron cargar los ejercicios</h3>
          <p className="nb-dash-body-text">{error}</p>
        </>
      ) : (
        <p className="nb-dash-body-text">Cargando ejercicios…</p>
      )}
    </div>
  </div>
);

export default FundamentosCarga;
