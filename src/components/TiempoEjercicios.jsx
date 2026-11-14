import { duracion } from '../scripts/docenteData';
import { buscarNivel } from '../scripts/fundamentosData';

const nombreDe = (e) => (e.tipo === 'problema'
  ? `Problema ${e.numero}`
  : `${buscarNivel(e.nivel)?.titulo || 'Fundamentos'} · ejercicio ${e.numero}`);

/**
 * Cuánto tiempo activo pasó el estudiante dentro de cada ejercicio (Problemas y Fundamentos),
 * frente al tiempo total en la plataforma. Lo ven el estudiante y su docente.
 */
const TiempoEjercicios = ({ ejercicios, totales, limite = 12 }) => {
  const resueltos = ejercicios.filter((e) => e.resuelto);
  return (
    <>
      <div className="nb-doc-tiempos">
        <div className="nb-doc-dato"><small>En ejercicios</small><strong>{duracion(totales.segundosEjercicios)}</strong></div>
        <div className="nb-doc-dato"><small>En la plataforma</small><strong>{duracion(totales.segundos)}</strong></div>
        <div className="nb-doc-dato"><small>Ejercicios trabajados</small><strong>{ejercicios.length}</strong></div>
        <div className="nb-doc-dato">
          <small>Promedio por resuelto</small>
          <strong>{resueltos.length ? duracion(resueltos.reduce((t, e) => t + e.segundos, 0) / resueltos.length) : '—'}</strong>
        </div>
      </div>
      {ejercicios.length ? (
        <ul className="nb-doc-tabla">
          {ejercicios.slice(0, limite).map((e) => (
            <li key={`${e.tipo}-${e.nivel || ''}-${e.numero}`} className="nb-doc-fila">
              <span className="nb-doc-celda is-grande">
                <strong>{e.titulo}</strong>
                <small className="nb-comp-hora">{nombreDe(e)}</small>
              </span>
              <span className="nb-doc-dato"><small>Tiempo</small><strong>{duracion(e.segundos)}</strong></span>
              <span className="nb-doc-dato"><small>Días</small><strong>{e.dias}</strong></span>
              <span className={`nb-doc-estado${e.resuelto ? ' is-on' : ''}`}>{e.resuelto ? 'Resuelto' : 'En curso'}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="nb-doc-vacio">Aún no hay tiempo registrado dentro de un ejercicio.</p>
      )}
      <p className="nb-comp-sub">
        Cuenta el tiempo con la pestaña abierta, enfocada y en uso dentro de cada ejercicio. Se mide desde noviembre de 2026.
      </p>
    </>
  );
};

export default TiempoEjercicios;
