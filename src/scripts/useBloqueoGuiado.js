import { useMemo } from 'react';
import { useEntrenamiento } from './useEntrenamiento';
import { rutaDeTemas } from './entrenamiento';

/**
 * Modo guiado de la clase (lo activa el docente): qué temas están cerrados para el estudiante.
 * Es una guía de la interfaz, no un control de seguridad: la categoría se calcula en el navegador.
 */
export const useBloqueoGuiado = (user) => {
  const { datos, catalogo } = useEntrenamiento(user);
  const ruta = useMemo(
    () => (datos?.rutaGuiada && catalogo ? rutaDeTemas(catalogo, datos.resueltos, datos.nivel, { guiada: true }) : null),
    [datos, catalogo],
  );
  return {
    guiada: Boolean(datos?.rutaGuiada),
    // null si el tema está abierto; si no, el tema bloqueado con lo que falta (`requiere`).
    bloqueoDe: (slug) => ruta?.find((t) => t.slug === slug && t.bloqueado) ?? null,
  };
};
