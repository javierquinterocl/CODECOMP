import { rutaApi } from './apiBase';

const leer = async (response, porDefecto) => {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || porDefecto);
  return data;
};

const pedir = async (user, ruta, porDefecto) => leer(
  await fetch(rutaApi(ruta), { headers: { Authorization: `Bearer ${await user.getIdToken()}` } }),
  porDefecto,
);

/** Panel de una clase: estudiantes con alertas, temas, problemas que cuestan y actividad. */
export const getPanelClase = (user, claseId) =>
  pedir(user, `docente/clase/${claseId}`, 'No se pudo cargar la clase.');

/** Ficha de un estudiante de una clase del docente. */
export const getFichaEstudiante = (user, estudianteId) =>
  pedir(user, `docente/estudiante/${estudianteId}`, 'No se pudo cargar el estudiante.');
