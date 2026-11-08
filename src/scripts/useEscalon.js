import { useEffect, useState } from 'react';
import { getProgress } from './progressApi';

// Una petición por usuario y visita: la cabecera, el listado, el ejercicio y el inicio la comparten.
let enMemoria = { uid: null, promesa: null };
const EVENTO = 'codecomp:progreso';

const pedirResumen = (user) => {
  if (enMemoria.uid !== user.uid || !enMemoria.promesa) {
    enMemoria = {
      uid: user.uid,
      promesa: getProgress(user).catch(() => {
        enMemoria = { uid: null, promesa: null };
        return null;
      }),
    };
  }
  return enMemoria.promesa;
};

/** Tras un envío el escalón y la racha pueden cambiar: se vuelven a pedir en todas partes. */
export const olvidarEscalon = () => {
  enMemoria = { uid: null, promesa: null };
  window.dispatchEvent(new Event(EVENTO));
};

/** Resumen de /progress (`escalon`, `racha`, …) o null mientras carga o sin el juez adaptativo. */
export const useResumenProgreso = (user) => {
  const [resumen, setResumen] = useState(null);
  useEffect(() => {
    if (!user || import.meta.env.VITE_ENABLE_ADAPTIVE !== 'true') return undefined;
    let vigente = true;
    const cargar = () => pedirResumen(user).then((r) => { if (vigente) setResumen(r); });
    cargar();
    window.addEventListener(EVENTO, cargar);
    return () => { vigente = false; window.removeEventListener(EVENTO, cargar); };
  }, [user]);
  return resumen;
};

/**
 * Escalón de práctica del estudiante (`{ actual, nivelParaSubir, resueltosEnActual, ... }`)
 * o null mientras carga. Bloqueo suave: solo sirve para marcar.
 */
const useEscalon = (user) => useResumenProgreso(user)?.escalon || null;

export default useEscalon;
