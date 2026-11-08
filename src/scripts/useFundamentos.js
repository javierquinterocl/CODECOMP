import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getAvance, getEjercicios } from './fundamentosApi';

const SIN_AVANCE = { visitas: {}, resueltos: {} };

// Ejercicios de Fundamentos y, si se pide, el avance: último visto y resueltos por nivel.
// Si falla el avance se sigue sin él; si fallan los ejercicios no hay nada que mostrar.
export const useFundamentos = ({ conVisitas = false } = {}) => {
  const { user, authReady } = useAuth();
  const [estado, setEstado] = useState({ ejercicios: null, ...SIN_AVANCE, error: '' });

  useEffect(() => {
    if (conVisitas && !authReady) return undefined;
    let vigente = true;
    const avance = conVisitas ? getAvance(user).catch(() => SIN_AVANCE) : Promise.resolve(SIN_AVANCE);
    Promise.all([getEjercicios(), avance])
      .then(([ejercicios, { visitas, resueltos }]) => {
        if (vigente) setEstado({ ejercicios, visitas, resueltos, error: '' });
      })
      .catch((e) => {
        if (vigente) setEstado({ ejercicios: null, ...SIN_AVANCE, error: e.message });
      });
    return () => { vigente = false; };
  }, [conVisitas, authReady, user]);

  return { ...estado, cargando: !estado.ejercicios && !estado.error };
};
