import { useEffect } from 'react';
import { abrirSesionCookie, enviarResumen, EVENTO_VACIAR_ACTIVIDAD, USA_COOKIE } from './registroApi';

const TICK_MS = 15_000;
const RENOVAR_MS = 60 * 60_000;
const ENVIO_MS = 60_000;
// Sin teclado, ratón ni scroll en este tiempo, la pestaña abierta no cuenta como actividad.
const INACTIVO_MS = 2 * 60_000;

const RUTA_PROBLEMA = /^\/dashboard\/problemas\/[^/]+\/(\d+)\/?$/;
const RUTA_FUNDAMENTOS = /^\/dashboard\/fundamentos\/(fundamentos|practica|avanzado)\/(\d+)\/?$/;

/** El ejercicio que se está haciendo según la ruta, o null fuera de un ejercicio. */
export const ejercicioDeRuta = (ruta) => {
  const p = RUTA_PROBLEMA.exec(ruta || '');
  if (p) return { tipo: 'problema', numero: Number(p[1]) };
  const f = RUTA_FUNDAMENTOS.exec(ruta || '');
  if (f) return { tipo: 'fundamentos', nivel: f[1], numero: Number(f[2]) };
  return null;
};

const claveDe = (e) => (e ? `${e.tipo}:${e.nivel || ''}:${e.numero}` : '');
const vacio = () => ({ segundos: 0, pegados: 0, caracteres: 0, ejercicios: new Map() });

/**
 * Mide el tiempo activo (pestaña visible, con foco y uso reciente), el de cada ejercicio y los
 * pegados dentro de un editor (solo su tamaño). Envía cada minuto, al salir de un ejercicio y al
 * cerrar. Solo corre con autorización. `rutaRef.current` es la ruta actual.
 */
const useActividad = (user, activo, rutaRef) => {
  useEffect(() => {
    if (!user || !activo) return undefined;

    let resumen = vacio();
    let ultimoUso = Date.now();
    let anterior = '';
    let token = null;
    const refrescarToken = () => user.getIdToken().then((t) => { token = t; }).catch(() => {});
    refrescarToken();
    // Con dominio propio la actividad viaja con la cookie cifrada; se renueva cada hora.
    abrirSesionCookie(user);
    const renovar = USA_COOKIE ? setInterval(() => abrirSesionCookie(user), RENOVAR_MS) : null;

    // Se toma lo acumulado y, si el envío falla, vuelve a sumarse para el próximo.
    const vaciar = async (alCerrar = false) => {
      if (!resumen.segundos && !resumen.pegados) return;
      const enviado = resumen;
      resumen = vacio();
      const ok = await enviarResumen({ ...enviado, ejercicios: [...enviado.ejercicios.values()] }, token, { alCerrar });
      if (!ok && !alCerrar) {
        resumen.segundos += enviado.segundos;
        resumen.pegados += enviado.pegados;
        resumen.caracteres += enviado.caracteres;
        for (const [k, e] of enviado.ejercicios) {
          const previo = resumen.ejercicios.get(k);
          resumen.ejercicios.set(k, { ...e, segundos: e.segundos + (previo?.segundos || 0) });
        }
      }
    };

    const usar = () => { ultimoUso = Date.now(); };
    // En burbuja: el editor de Fundamentos bloquea el pegado y ese no se cuenta.
    const pegar = (evento) => {
      if (evento.target?.tagName !== 'TEXTAREA' || evento.defaultPrevented) return;
      resumen.pegados += 1;
      resumen.caracteres += evento.clipboardData?.getData('text')?.length || 0;
    };
    const ocultar = () => { if (document.visibilityState === 'hidden') vaciar(); };
    const cerrar = () => vaciar(true);
    const pedirVaciado = () => vaciar();

    const tick = setInterval(() => {
      const ejercicio = ejercicioDeRuta(rutaRef?.current);
      const clave = claveDe(ejercicio);
      // Al salir de un ejercicio se envía enseguida, para que su tiempo se vea al día.
      if (anterior && clave !== anterior) vaciar();
      anterior = clave;
      // Solo la pestaña con foco cuenta: con dos abiertas el tiempo no se duplica.
      const activa = document.visibilityState === 'visible' && document.hasFocus() && Date.now() - ultimoUso < INACTIVO_MS;
      if (!activa) return;
      const s = TICK_MS / 1000;
      resumen.segundos += s;
      if (ejercicio) {
        const previo = resumen.ejercicios.get(clave);
        resumen.ejercicios.set(clave, { ...ejercicio, segundos: (previo?.segundos || 0) + s });
      }
    }, TICK_MS);
    const envio = setInterval(() => { refrescarToken(); vaciar(); }, ENVIO_MS);

    const eventos = ['keydown', 'pointerdown', 'pointermove', 'scroll'];
    eventos.forEach((e) => window.addEventListener(e, usar, { passive: true }));
    document.addEventListener('paste', pegar);
    document.addEventListener('visibilitychange', ocultar);
    window.addEventListener('pagehide', cerrar);
    window.addEventListener(EVENTO_VACIAR_ACTIVIDAD, pedirVaciado);

    return () => {
      vaciar();
      clearInterval(tick);
      clearInterval(envio);
      if (renovar) clearInterval(renovar);
      eventos.forEach((e) => window.removeEventListener(e, usar));
      document.removeEventListener('paste', pegar);
      document.removeEventListener('visibilitychange', ocultar);
      window.removeEventListener('pagehide', cerrar);
      window.removeEventListener(EVENTO_VACIAR_ACTIVIDAD, pedirVaciado);
    };
  }, [user, activo, rutaRef]);
};

export default useActividad;
