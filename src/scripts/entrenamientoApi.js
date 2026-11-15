import { rutaApi } from './apiBase';

/** Resueltos, envíos por etiqueta, nivel y resueltos sin pista del estudiante (GET /entrenamiento). */
export const getEntrenamiento = async (user) => {
  const response = await fetch(rutaApi('entrenamiento'), {
    headers: { Authorization: `Bearer ${await user.getIdToken()}` },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || 'No se pudo cargar tu entrenamiento.');
  return data;
};
