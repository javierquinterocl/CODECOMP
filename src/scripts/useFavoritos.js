import { useCallback, useEffect, useState } from 'react';

// Favoritos en localStorage: por navegador, no viajan con la cuenta.
// El evento propio existe porque `storage` no avisa a la pestaña que escribió.

const CLAVE = 'codecomp:problemas:favoritos';
const EVENTO = 'codecomp:favoritos';

const leer = () => {
  try {
    const crudo = localStorage.getItem(CLAVE);
    const lista = crudo ? JSON.parse(crudo) : [];
    return Array.isArray(lista) ? lista.map(Number) : [];
  } catch {
    // Modo privado o almacenamiento bloqueado.
    return [];
  }
};

const guardar = (lista) => {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(lista));
  } catch {
    // Sin persistencia, pero la vista sigue respondiendo.
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
