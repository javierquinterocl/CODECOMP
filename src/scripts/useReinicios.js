import { useEffect, useRef, useState } from 'react';

const MAX = 3;
const VACIO = { atras: [], adelante: [] };

/**
 * Retroceder y adelantar reinicios del editor. Guarda en memoria (por `clave`, p. ej. el
 * lenguaje) hasta 3 códigos anteriores; se pierden al salir del ejercicio. Retroceder y adelantar
 * solo mueven códigos entre las dos pilas: lo único que puede perder algo es reiniciar, y ahí se
 * pide confirmación. `poner` escribe el código en el editor. `reiniciar` resuelve true si reinició.
 */
const useReinicios = ({ clave, codigo, plantilla, poner, confirmar }) => {
  const [historial, setHistorial] = useState({});
  const [ocupado, setOcupado] = useState(false);
  // El código vigente se lee al final: el estudiante puede teclear mientras confirma.
  const codigoRef = useRef(codigo);
  useEffect(() => { codigoRef.current = codigo; }, [codigo]);
  const actual = historial[clave] ?? VACIO;

  const guardar = (siguiente) => setHistorial((h) => ({ ...h, [clave]: siguiente }));

  const reiniciar = async () => {
    if (ocupado || codigoRef.current === plantilla) return false;
    const seCae = actual.adelante.length + Math.max(0, actual.atras.length + 1 - MAX);
    if (seCae > 0) {
      setOcupado(true);
      const ok = await confirmar({
        titulo: 'Reiniciar el código',
        mensaje: `Solo se guardan los ${MAX} últimos reinicios. Si reinicias ahora, se perderá definitivamente ${seCae === 1 ? 'un código anterior' : `${seCae} códigos anteriores`}.`,
        confirmar: 'Reiniciar',
        peligro: true,
      });
      setOcupado(false);
      if (!ok) return false;
    }
    guardar({ atras: [...actual.atras, codigoRef.current].slice(-MAX), adelante: [] });
    poner(plantilla);
    return true;
  };

  const retroceder = () => {
    if (ocupado || !actual.atras.length) return;
    const recuperado = actual.atras[actual.atras.length - 1];
    guardar({ atras: actual.atras.slice(0, -1), adelante: [...actual.adelante, codigoRef.current] });
    poner(recuperado);
  };

  const adelantar = () => {
    if (ocupado || !actual.adelante.length) return;
    const recuperado = actual.adelante[actual.adelante.length - 1];
    guardar({ atras: [...actual.atras, codigoRef.current], adelante: actual.adelante.slice(0, -1) });
    poner(recuperado);
  };

  return {
    reiniciar,
    retroceder,
    adelantar,
    puedeRetroceder: !ocupado && actual.atras.length > 0,
    puedeAdelantar: !ocupado && actual.adelante.length > 0,
  };
};

export default useReinicios;
