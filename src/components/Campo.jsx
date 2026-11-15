import { Children, cloneElement, isValidElement } from 'react';

/**
 * Campo de formulario con etiqueta, línea de ayuda con ejemplo (siempre visible) y error en
 * rojo. Le pasa al control `aria-invalid`, `aria-required` y `aria-describedby`.
 */
const Campo = ({
  id, label, ayuda, error, opcional = false, adorno = null, describe: extra, children, className = 'nb-field',
}) => {
  const idAyuda = ayuda ? `${id}-ayuda` : null;
  const idError = error ? `${id}-error` : null;
  const control = Children.only(children);
  const describe = [idError, idAyuda, extra].filter(Boolean).join(' ') || undefined;
  const conAria = isValidElement(control)
    ? cloneElement(control, {
      id,
      'aria-invalid': Boolean(error),
      'aria-required': !opcional,
      'aria-describedby': describe,
      className: `${control.props.className ?? 'nb-input'}${error ? ' is-error' : ''}`,
    })
    : control;
  return (
    <div className={className}>
      <label htmlFor={id} className="nb-label">
        {label}{opcional && <span className="nb-opcional"> (opcional)</span>}
      </label>
      {/* El adorno (botón para ver la contraseña) va junto al input, fuera de sus atributos. */}
      {adorno ? <div className="nb-eye-wrap">{conAria}{adorno}</div> : conAria}
      {error && <span id={idError} className="nb-error">{error}</span>}
      {ayuda && <span id={idAyuda} className="nb-ayuda">{ayuda}</span>}
    </div>
  );
};

/** Resumen al enviar: un solo aviso para lectores de pantalla con cuántos campos revisar. */
export const ResumenErrores = ({ total }) => (total > 0 ? (
  <div className="nb-note nb-note-error" role="alert">
    {total === 1 ? 'Revisa el campo marcado en rojo.' : `Revisa los ${total} campos marcados en rojo.`}
  </div>
) : null);

export default Campo;
