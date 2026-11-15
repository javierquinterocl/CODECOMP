import { useEffect, useState } from 'react';
import { getAllProblems } from './problemsApi';
import { getEntrenamiento } from './entrenamientoApi';

/** Catálogo (en memoria) y datos de entrenamiento del estudiante, pedidos en paralelo. */
export const useEntrenamiento = (user) => {
  const [estado, setEstado] = useState({ datos: null, catalogo: null, error: '' });

  useEffect(() => {
    if (!user) return undefined;
    let vigente = true;
    Promise.all([getEntrenamiento(user), getAllProblems()])
      .then(([datos, catalogo]) => { if (vigente) setEstado({ datos, catalogo, error: '' }); })
      .catch((e) => { if (vigente) setEstado({ datos: null, catalogo: null, error: e.message }); });
    return () => { vigente = false; };
  }, [user]);

  return estado;
};
