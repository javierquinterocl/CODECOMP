import { useRef, useState } from 'react';

const MAX_ERRORES = 30;

/**
 * Estado del panel del gato y su chat de errores de la sesión (Fundamentos y Problemas).
 * No se guarda: vive mientras la vista esté montada y `vaciar` lo limpia (Reiniciar).
 */
export const useChatErrores = () => {
  // El panel arranca plegado: el estudiante lo abre cuando quiere.
  const [oculto, setOculto] = useState(true);
  const [vista, setVista] = useState('tema');
  const [errores, setErrores] = useState([]);
  const [leidos, setLeidos] = useState(0);
  // Contador propio: tras Reiniciar no vuelve a salir "Envío 1".
  const envios = useRef(0);

  const viendoErrores = !oculto && vista === 'errores' && errores.length > 0;
  const sinLeer = viendoErrores ? 0 : Math.max(0, errores.length - leidos);

  /** Cuenta un envío evaluado y, si falló, agrega su explicación ({ titulo, texto, oficial, diferencia }). */
  const registrar = (error) => {
    envios.current += 1;
    if (!error) return;
    const nuevo = { ...error, n: envios.current };
    setErrores((lista) => [...lista, nuevo].slice(-MAX_ERRORES));
  };

  const vaciar = () => {
    setErrores([]);
    setLeidos(0);
  };

  const panel = {
    oculto,
    errores,
    sinLeer,
    vista,
    onAlternar: () => {
      if (viendoErrores) setLeidos(errores.length);
      setOculto((v) => !v);
    },
    onVista: (v) => {
      if (viendoErrores && v !== 'errores') setLeidos(errores.length);
      setVista(v);
    },
    onAbrirErrores: () => {
      setVista('errores');
      setOculto(false);
    },
  };

  return { registrar, vaciar, panel };
};
