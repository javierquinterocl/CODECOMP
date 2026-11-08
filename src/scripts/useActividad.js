import { useEffect } from 'react';
import { enviarResumen } from './registroApi';

const TICK_MS = 15_000;
const ENVIO_MS = 5 * 60_000;
// Sin teclado, ratón ni scroll en este tiempo, la pestaña abierta no cuenta como actividad.
const INACTIVO_MS = 2 * 60_000;

/**
 * Mide el tiempo activo (pestaña visible y con uso reciente) y los pegados dentro de un
 * editor, solo su tamaño, y lo manda cada 5 minutos y al salir. Solo corre con autorización.
 */
const useActividad = (user, activo) => {
  useEffect(() => {
    if (!user || !activo) return undefined;

    let resumen = { segundos: 0, pegados: 0, caracteres: 0 };
    let ultimoUso = Date.now();
    let token = null;
    const refrescarToken = () => user.getIdToken().then((t) => { token = t; }).catch(() => {});
    refrescarToken();

    const vaciar = () => {
      if (!token || (!resumen.segundos && !resumen.pegados)) return;
      enviarResumen(resumen, token);
      resumen = { segundos: 0, pegados: 0, caracteres: 0 };
    };

    const usar = () => { ultimoUso = Date.now(); };
    // En burbuja: el editor de Fundamentos bloquea el pegado y ese no se cuenta.
    const pegar = (evento) => {
      if (evento.target?.tagName !== 'TEXTAREA' || evento.defaultPrevented) return;
      resumen.pegados += 1;
      resumen.caracteres += evento.clipboardData?.getData('text')?.length || 0;
    };
    const ocultar = () => { if (document.visibilityState === 'hidden') vaciar(); };

    const tick = setInterval(() => {
      if (document.visibilityState === 'visible' && Date.now() - ultimoUso < INACTIVO_MS) {
        resumen.segundos += TICK_MS / 1000;
      }
    }, TICK_MS);
    const envio = setInterval(() => { refrescarToken(); vaciar(); }, ENVIO_MS);

    const eventos = ['keydown', 'pointerdown', 'pointermove', 'scroll'];
    eventos.forEach((e) => window.addEventListener(e, usar, { passive: true }));
    document.addEventListener('paste', pegar);
    document.addEventListener('visibilitychange', ocultar);
    window.addEventListener('pagehide', vaciar);

    return () => {
      vaciar();
      clearInterval(tick);
      clearInterval(envio);
      eventos.forEach((e) => window.removeEventListener(e, usar));
      document.removeEventListener('paste', pegar);
      document.removeEventListener('visibilitychange', ocultar);
      window.removeEventListener('pagehide', vaciar);
    };
  }, [user, activo]);
};

export default useActividad;
