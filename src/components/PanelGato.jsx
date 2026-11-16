import { Link } from 'react-router-dom';
import { ChatIcon, CollapseIcon, ExpandIcon } from './AppIcons';

/* Errores de la sesión, como mensajes del gato. No se guardan: Reiniciar o salir los borra. */
const ChatErrores = ({ errores }) => errores.map((e) => (
  <div key={e.n} className="nb-fd-msg">
    <span className="nb-fd-gato-avatar" aria-hidden="true"><img src="/cat-pixel.png" alt="" width="512" height="512" /></span>
    <div className="nb-fd-burbuja is-error">
      <span className="nb-fd-error-envio">Envío {e.n}</span>
      <p><strong>{e.titulo}</strong></p>
      {e.oficial && <p className="nb-fd-error-oficial">{e.oficial}</p>}
      <p>{e.texto}</p>
      {e.diferencia && <p className="nb-fd-error-dif">{e.diferencia}</p>}
    </div>
  </div>
));

/**
 * Panel lateral del gato (Fundamentos y Problemas): datos del tema y, si hay fallos, el chat de
 * errores de la sesión. `mensajes`: [{ texto, codigo?, enlace?: { a, texto } }]. El estado sale de
 * `useChatErrores` (`panel`).
 */
const PanelGato = ({ titulo, mensajes, oculto, onAlternar, errores, sinLeer, vista, onVista, onAbrirErrores }) => {
  const accion = oculto ? 'Mostrar los datos del tema' : 'Ocultar los datos del tema';
  const conErrores = errores.length > 0;
  const enErrores = conErrores && vista === 'errores';
  const etiquetaErrores = `Errores de este ejercicio${sinLeer ? `, ${sinLeer} sin leer` : ''}`;

  return (
    <aside className={`nb-fd-lateral${oculto ? ' is-collapsed' : ''}`} aria-label={`Datos del tema ${titulo}`}>
      <div className="nb-fd-lateral-head">
        <button
          type="button"
          className="nb-fd-lateral-toggle"
          onClick={onAlternar}
          aria-expanded={!oculto}
          title={accion}
          aria-label={accion}
        >
          {oculto ? <CollapseIcon /> : <ExpandIcon />}
        </button>
        <div className="nb-fd-lateral-quien">
          <span className="nb-fd-lateral-nombre">¡Datos que debes tener en cuenta!</span>
          <span className="nb-fd-lateral-tema">{titulo}</span>
        </div>
        {/* Plegado: bajo la cara del gato. En pantallas angostas: en la cabecera. */}
        {conErrores && (
          <button
            type="button"
            className={`nb-fd-lateral-errores${oculto ? ' is-visible' : ''}`}
            onClick={onAbrirErrores}
            title={etiquetaErrores}
            aria-label={etiquetaErrores}
          >
            <ChatIcon />
            {sinLeer > 0 && <span className="nb-fd-errores-cuenta" aria-hidden="true">{sinLeer > 9 ? '9+' : sinLeer}</span>}
          </button>
        )}
      </div>

      {/* Con el panel plegado solo queda la cara del gato, que lo vuelve a abrir. */}
      <button
        type="button"
        className="nb-fd-lateral-cara"
        onClick={onAlternar}
        tabIndex={oculto ? 0 : -1}
        aria-hidden={!oculto}
        title={accion}
        aria-label={accion}
      >
        <span className="nb-fd-gato-avatar"><img src="/cat-pixel.png" alt="" width="512" height="512" /></span>
      </button>

      <div className="nb-fd-lateral-body" inert={oculto}>
        {conErrores && (
          <div className="nb-ex-idioma nb-fd-vistas" role="group" aria-label="Qué mostrar en el panel">
            <button type="button" className={`nb-ex-idioma-btn${enErrores ? '' : ' is-active'}`} aria-pressed={!enErrores} onClick={() => onVista('tema')}>Tema</button>
            <button type="button" className={`nb-ex-idioma-btn${enErrores ? ' is-active' : ''}`} aria-pressed={enErrores} onClick={() => onVista('errores')}>Errores ({errores.length})</button>
          </div>
        )}
        {enErrores ? <ChatErrores errores={errores} /> : mensajes.map((m) => (
          <div key={m.texto} className="nb-fd-msg">
            <span className="nb-fd-gato-avatar" aria-hidden="true"><img src="/cat-pixel.png" alt="" width="512" height="512" /></span>
            <div className="nb-fd-burbuja">
              <p>{m.texto}</p>
              {m.codigo && <pre>{m.codigo}</pre>}
              {m.enlace && <Link className="nb-fd-burbuja-enlace" to={m.enlace.a}>{m.enlace.texto}</Link>}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
};

export default PanelGato;
