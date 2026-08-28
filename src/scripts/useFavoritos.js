import { useCallback, useEffect, useState } from 'react';

/**
 * Marcas de "favorito" del módulo de Problemas.
 *
 * Por ahora viven en localStorage: no hay colección en Firestore todavía,
 * así que la marca es por navegador y no viaja con la cuenta. Cuando exista
 * el documento del usuario, basta con cambiar leer//guardar por Firestore —
 * la API del hook (`esFavorito` / `alternar`) no cambia.
 *
 * Se sincroniza entre pestañas y entre las dos vistas que lo usan (listado y
 * detalle) mediante un evento propio, porque `storage` solo avisa a las otras
 * pestañas, nunca a la que escribió.
 */

const CLAVE = 'codecomp:problemas:favoritos';
const EVENTO = 'codecomp:favoritos';

const leer = () => {
  try {
    const crudo = localStorage.getItem(CLAVE);
    const lista = crudo ? JSON.parse(crudo) : [];
    return Array.isArray(lista) ? lista.map(Number) : [];
  } catch {
    // Modo privado o almacenamiento bloqueado: se sigue sin favoritos.
    return [];
  }
};

const guardar = (lista) => {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(lista));
  } catch {
    /* sin persistencia, pero la vista sigue respondiendo */
  }
  window.dispatchEvent(new CustomEvent(EVENTO, { detail: lista }));
};

export const useFavoritos = () => {
  const [favoritos, setFavoritos] = useState(leer);

  useEffect(() => {
    const sincronizar = () => setFavoritos(leer());
    window.addEventListener(EVENTO, sincronizar);
    window.addEventListener('storage', sincronizar);
    return () => {
      window.removeEventListener(EVENTO, sincronizar);
      window.removeEventListener('storage', sincronizar);
    };
  }, []);

  const alternar = useCallback((numero) => {
    const actuales = leer();
    const n = Number(numero);
    const siguiente = actuales.includes(n)
      ? actuales.filter((x) => x !== n)
      : [...actuales, n];
    setFavoritos(siguiente);
    guardar(siguiente);
  }, []);

  const esFavorito = useCallback((numero) => favoritos.includes(Number(numero)), [favoritos]);

  return { favoritos, esFavorito, alternar };
};
