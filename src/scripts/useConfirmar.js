import { useCallback, useRef, useState } from 'react';

/**
 * Pide confirmación con ConfirmarDialogo y espera la respuesta:
 * `if (await confirmar({ titulo, mensaje, confirmar: 'Archivar', peligro: true })) { ... }`.
 */
const useConfirmar = () => {
  const [pedido, setPedido] = useState(null);
  const resolver = useRef(null);

  const confirmar = useCallback((opciones) => new Promise((resolve) => {
    resolver.current = resolve;
    setPedido(opciones);
  }), []);

  const responder = useCallback((respuesta) => {
    resolver.current?.(respuesta);
    resolver.current = null;
    setPedido(null);
  }, []);

  return { pedido, confirmar, responder };
};

export default useConfirmar;
