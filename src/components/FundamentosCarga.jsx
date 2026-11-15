import { Link } from 'react-router-dom';
import { EsqPagina } from './Esqueleto';

/**
 * Lo que muestran las páginas de Fundamentos mientras llegan los ejercicios (la forma de la
 * página: 'niveles', 'lista' o 'ejercicio'), o el error si no llegan.
 */
const FundamentosCarga = ({ error = '', volverA = '', forma = 'niveles' }) => {
  if (!error) return <EsqPagina forma={forma} ancha={forma === 'ejercicio'} aviso="Cargando ejercicios…" />;
  return (
    <div className="nb-dash-inner">
      {volverA && <Link to={volverA} className="nb-pb-back">← Volver</Link>}
      <div className="nb-pb-empty" aria-live="polite">
        <h3 className="nb-pb-empty-title">No se pudieron cargar los ejercicios</h3>
        <p className="nb-dash-body-text">{error}</p>
      </div>
    </div>
  );
};

export default FundamentosCarga;
