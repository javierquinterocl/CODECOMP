import { useCallback, useEffect, useState } from 'react';

// Idioma de los problemas, en localStorage: por navegador, igual que los favoritos.
// El evento propio existe porque `storage` no avisa a la pestaña que escribió.

const CLAVE = 'codecomp:problemas:idioma';
const EVENTO = 'codecomp:idioma';

export const IDIOMAS = [
  { id: 'en', nombre: 'Inglés' },
  { id: 'es', nombre: 'Español' },
];

// Por defecto, inglés: el español solo aparece si el estudiante lo elige.
const leer = () => {
  try {
    return localStorage.getItem(CLAVE) === 'es' ? 'es' : 'en';
  } catch {
    // Modo privado o almacenamiento bloqueado.
    return 'en';
  }
};

export const useIdioma = () => {
  const [idioma, setIdioma] = useState(leer);

  useEffect(() => {
    const sincronizar = () => setIdioma(leer());
    window.addEventListener(EVENTO, sincronizar);
    window.addEventListener('storage', sincronizar);
    return () => {
      window.removeEventListener(EVENTO, sincronizar);
      window.removeEventListener('storage', sincronizar);
    };
  }, []);

  const cambiar = useCallback((id) => {
    setIdioma(id);
    try {
      localStorage.setItem(CLAVE, id);
    } catch {
      // Sin persistencia, la elección vale para esta visita.
    }
    window.dispatchEvent(new CustomEvent(EVENTO, { detail: id }));
  }, []);

  return { idioma, cambiar };
};
