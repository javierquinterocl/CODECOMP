import { useState } from 'react';
import NbSelect from '../NbSelect';

/** Etiqueta de cada aclaración según quién la ve. Textos borrador. */
const etiquetaDe = (a, jurado) => {
  if (jurado) return a.de ? `Pregunta de ${a.de.nombre}` : a.para ? `Respuesta a ${a.para.nombre}` : 'Aviso para todos';
  if (a.propia) return 'Tu pregunta';
  return a.general ? 'Aviso del jurado' : 'Respuesta del jurado';
};

/**
 * Aclaraciones de una competencia. El estudiante pregunta al jurado; el jurado responde a un
 * equipo o avisa a todos. `onEnviar({ texto, problema?, equipo?, responderA? })` devuelve una promesa.
 */
const Aclaraciones = ({ lista, jurado = false, problemas = [], equipos = [], puedeEnviar = true, onEnviar }) => {
  const [texto, setTexto] = useState('');
  const [problema, setProblema] = useState('');
  const [equipo, setEquipo] = useState('');
  const [responderA, setResponderA] = useState(null);
  const [estado, setEstado] = useState({ ocupado: false, error: '', hecho: '' });

  const responder = (a) => {
    setResponderA(a);
    setEquipo(a.de?.id || '');
  };

  const enviar = async (e) => {
    e.preventDefault();
    setEstado({ ocupado: true, error: '', hecho: '' });
    try {
      await onEnviar(jurado
        ? { texto, equipo: equipo || null, responderA: responderA?.id || null }
        : { texto, problema: problema || null });
      setTexto('');
      setResponderA(null);
      setEstado({ ocupado: false, error: '', hecho: jurado ? 'Enviado.' : 'Pregunta enviada al jurado.' });
    } catch (err) {
      setEstado({ ocupado: false, error: err.message, hecho: '' });
    }
  };

  return (
    <div className="nb-dash-card nb-comp-panel nb-comp-form">
      {puedeEnviar && (
        <form className="nb-comp-aclarar" onSubmit={enviar}>
          <div className="nb-dash-kicker">{jurado ? 'Responder o avisar' : 'Preguntar al jurado'}</div>
          {responderA && (
            <p className="nb-comp-sub">
              Respondiendo a: «{responderA.texto.slice(0, 120)}»{' '}
              <button type="button" className="nb-dash-aviso-mas" onClick={() => setResponderA(null)}>Cancelar</button>
            </p>
          )}
          <div className="nb-comp-letra-sel">
            {jurado ? (
              <NbSelect
                label="Para"
                value={equipo}
                onChange={setEquipo}
                options={[{ value: '', label: 'Todos los equipos' }, ...equipos.map((q) => ({ value: q.teamId, label: q.nombre }))]}
              />
            ) : (
              <NbSelect
                label="Sobre"
                value={problema}
                onChange={setProblema}
                options={[{ value: '', label: 'General' }, ...problemas.map((p) => ({ value: p.id, label: `Problema ${p.letra}` }))]}
              />
            )}
          </div>
          <textarea
            className="nb-input nb-comp-textarea"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            maxLength={jurado ? 2000 : 1000}
            rows={3}
            placeholder={jurado ? 'Escribe la respuesta o el aviso' : 'Escribe tu pregunta sobre el enunciado'}
            required
          />
          <div className="nb-comp-acciones">
            <button type="submit" className={`nb-ex-send${estado.ocupado ? ' is-busy' : ''}`} disabled={estado.ocupado}>
              {jurado ? 'Enviar' : 'Preguntar'}
            </button>
          </div>
          {estado.hecho && <p className="nb-comp-aviso" role="status">{estado.hecho}</p>}
          {estado.error && <p className="nb-comp-aviso is-fail" role="alert">{estado.error}</p>}
        </form>
      )}

      {lista.length ? (
        <ul className="nb-comp-aclaraciones">
          {lista.map((a) => (
            <li key={a.id} className={a.de || a.propia ? 'is-pregunta' : ''}>
              <div className="nb-comp-aclaracion-head">
                <span className="nb-dash-kicker is-ink">{etiquetaDe(a, jurado)}</span>
                <span className="nb-comp-hora">{a.problema ? `Problema ${a.problema} · ` : ''}{a.tiempo ? a.tiempo.split('.')[0] : ''}</span>
              </div>
              <p className="nb-comp-aclaracion-texto">{a.texto}</p>
              {jurado && a.de && (
                <button type="button" className="nb-dash-aviso-mas" onClick={() => responder(a)}>Responder</button>
              )}
            </li>
          ))}
        </ul>
      ) : <p className="nb-doc-vacio">Aún no hay aclaraciones.</p>}
    </div>
  );
};

export default Aclaraciones;
