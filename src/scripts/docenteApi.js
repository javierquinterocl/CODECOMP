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

/** Sube (o devuelve) el escalón mínimo de un estudiante: 1 a 5. */
export const cambiarEscalon = async (user, estudianteId, minimo) => leer(
  await fetch(rutaApi(`docente/estudiante/${estudianteId}/escalon`), {
    method: 'POST',
    headers: { Authorization: `Bearer ${await user.getIdToken()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ minimo }),
  }),
  'No se pudo cambiar el escalón.',
);

/** Aviso a todos los estudiantes de la clase (campana y correo). Devuelve destinatarios y restantes. */
export const avisarClase = async (user, claseId, aviso) => leer(
  await fetch(rutaApi(`docente/clase/${claseId}/aviso`), {
    method: 'POST',
    headers: { Authorization: `Bearer ${await user.getIdToken()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(aviso),
  }),
  'No se pudo enviar el aviso.',
);

/** Ficha de un estudiante de una clase del docente. */
export const getFichaEstudiante = (user, estudianteId) =>
  pedir(user, `docente/estudiante/${estudianteId}`, 'No se pudo cargar el estudiante.');
