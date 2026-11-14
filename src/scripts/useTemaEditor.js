import { useCallback, useEffect, useState } from 'react';

// Tema del editor por módulo, en localStorage (por navegador), igual que el idioma.
// Problemas arranca oscuro y PSeInt claro, como hasta ahora.

const POR_DEFECTO = { problemas: false, pseint: true };
const EVENTO = 'codecomp:tema-editor';
const clave = (modulo) => `codecomp:editor:${modulo}:claro`;

const leer = (modulo) => {
  try {
    const v = localStorage.getItem(clave(modulo));
    return v === null ? POR_DEFECTO[modulo] : v === '1';
  } catch {
    return POR_DEFECTO[modulo];
  }
};

/** `[claro, cambiar]`: el tema del editor de `modulo` ('problemas' o 'pseint'). */
export const useTemaEditor = (modulo) => {
  const [claro, setClaro] = useState(() => leer(modulo));

  useEffect(() => {
    const sincronizar = () => setClaro(leer(modulo));
    window.addEventListener(EVENTO, sincronizar);
    window.addEventListener('storage', sincronizar);
    return () => {
      window.removeEventListener(EVENTO, sincronizar);
      window.removeEventListener('storage', sincronizar);
    };
  }, [modulo]);

  const cambiar = useCallback((valor) => {
    const nuevo = typeof valor === 'function' ? valor(leer(modulo)) : valor;
    setClaro(nuevo);
    try {
      localStorage.setItem(clave(modulo), nuevo ? '1' : '0');
    } catch {
      // Sin almacenamiento, el tema vale para esta visita.
    }
    window.dispatchEvent(new CustomEvent(EVENTO));
  }, [modulo]);

  return [claro, cambiar];
};
