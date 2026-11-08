import { useEffect, useState } from 'react';
import { getProgress } from './progressApi';

// Una petición por usuario y visita: el listado, el ejercicio y el inicio la comparten.
let enMemoria = { uid: null, promesa: null };

const pedirEscalon = (user) => {
  if (enMemoria.uid !== user.uid || !enMemoria.promesa) {
    enMemoria = {
      uid: user.uid,
      promesa: getProgress(user).then((data) => data?.escalon || null).catch(() => {
        enMemoria = { uid: null, promesa: null };
        return null;
      }),
    };
  }
  return enMemoria.promesa;
};

/** Tras un envío el escalón puede subir: el siguiente que lo pida trae el nuevo. */
export const olvidarEscalon = () => { enMemoria = { uid: null, promesa: null }; };

/**
 * Escalón de práctica del estudiante (`{ actual, nivelParaSubir, resueltosEnActual, ... }`)
 * o null mientras carga o sin el juez adaptativo. Bloqueo suave: solo sirve para marcar.
 */
const useEscalon = (user) => {
  const [escalon, setEscalon] = useState(null);
  useEffect(() => {
    if (!user || import.meta.env.VITE_ENABLE_ADAPTIVE !== 'true') return undefined;
    let vigente = true;
    pedirEscalon(user).then((e) => { if (vigente) setEscalon(e); });
    return () => { vigente = false; };
  }, [user]);
  return escalon;
};

export default useEscalon;
