import { useEffect, useRef } from 'react';

/**
 * Confirmación con el diálogo del sistema (.nb-dialog) en vez de window.confirm.
 * Se usa con `useConfirmar` (src/scripts/useConfirmar.js): `<ConfirmarDialogo pedido={pedido} onRespuesta={responder} />`.
 */
const ConfirmarDialogo = ({ pedido, onRespuesta }) => {
  const botonRef = useRef(null);

  useEffect(() => {
    if (!pedido) return undefined;
    botonRef.current?.focus();
    const escape = (e) => { if (e.key === 'Escape') onRespuesta(false); };
    document.addEventListener('keydown', escape);
    return () => document.removeEventListener('keydown', escape);
  }, [pedido, onRespuesta]);

  if (!pedido) return null;
  const { titulo, mensaje, confirmar = 'Confirmar', peligro = false } = pedido;

  return (
    <div className="nb-dialog-backdrop" onClick={() => onRespuesta(false)}>
      <div className="nb-dialog" role="alertdialog" aria-modal="true" aria-labelledby="nb-confirmar-titulo" onClick={(e) => e.stopPropagation()}>
        <div className={`nb-dialog-head ${peligro ? 'is-error' : 'is-ok'}`}>
          <h2 className="nb-dialog-title" id="nb-confirmar-titulo">{titulo}</h2>
        </div>
        <p className="nb-dialog-body">{mensaje}</p>
        <div className="nb-dialog-foot nb-confirmar-acciones">
          <button type="button" className="nb-dash-btn-claro" onClick={() => onRespuesta(false)}>Cancelar</button>
          <button type="button" ref={botonRef} className={`nb-ex-send${peligro ? ' is-peligro' : ''}`} onClick={() => onRespuesta(true)}>
            {confirmar}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmarDialogo;
