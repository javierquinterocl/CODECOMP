import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { codigoVigente, errorDeCodigo, LARGO_CODIGO } from '../scripts/codigoUfpso';

/** Pide el código de 7 dígitos a quien aún tiene el viejo (decisión del equipo, 2026-11-08). */
const ActualizarCodigo = () => {
  const { user, isAdmin, codigoEstudiante, actualizarCodigoEstudiante } = useAuth();
  const [codigo, setCodigo] = useState('');
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  if (!user || isAdmin || !codigoEstudiante || codigoVigente(codigoEstudiante)) return null;

  const guardar = async (evento) => {
    evento.preventDefault();
    const problema = errorDeCodigo(codigo);
    if (problema) {
      setError(problema);
      return;
    }
    setGuardando(true);
    setError('');
    try {
      await actualizarCodigoEstudiante(codigo);
    } catch {
      setError('No se pudo guardar. Inténtalo de nuevo.');
      setGuardando(false);
    }
  };

  return (
    <aside className="nb-dash-card nb-dash-aviso is-corto" role="dialog" aria-label="Actualiza tu código UFPSO">
      <p className="nb-dash-aviso-text">
        <strong>Tu código UFPSO ahora tiene {LARGO_CODIGO} dígitos.</strong> Actualízalo para que tu docente te encuentre en la clase.
      </p>
      <form className="nb-dash-clase-form" onSubmit={guardar}>
        <input
          className={`nb-input${error ? ' is-error' : ''}`}
          aria-label="Código UFPSO de 7 dígitos"
          inputMode="numeric"
          maxLength={LARGO_CODIGO}
          placeholder={`Código de ${LARGO_CODIGO} dígitos`}
          value={codigo}
          onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ''))}
        />
        <button type="submit" className={`nb-ex-send${guardando ? ' is-busy' : ''}`} disabled={guardando}>Guardar</button>
      </form>
      {error && <p className="nb-dash-clase-msg is-error" role="alert">{error}</p>}
    </aside>
  );
};

export default ActualizarCodigo;
