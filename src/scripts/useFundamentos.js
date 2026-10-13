import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getEjercicios, getUltimasVisitas } from './fundamentosApi';

// Ejercicios de Fundamentos y, si se pide, el último visto por nivel.
// Si falla el avance se sigue sin él; si fallan los ejercicios no hay nada que mostrar.
export const useFundamentos = ({ conVisitas = false } = {}) => {
  const { user, authReady } = useAuth();
  const [estado, setEstado] = useState({ ejercicios: null, visitas: {}, error: '' });

  useEffect(() => {
    if (conVisitas && !authReady) return undefined;
    let vigente = true;
    const visitas = conVisitas ? getUltimasVisitas(user).catch(() => ({})) : Promise.resolve({});
    Promise.all([getEjercicios(), visitas])
      .then(([ejercicios, ultimas]) => {
        if (vigente) setEstado({ ejercicios, visitas: ultimas, error: '' });
      })
      .catch((e) => {
        if (vigente) setEstado({ ejercicios: null, visitas: {}, error: e.message });
      });
    return () => { vigente = false; };
  }, [conVisitas, authReady, user]);

  return { ...estado, cargando: !estado.ejercicios && !estado.error };
};
