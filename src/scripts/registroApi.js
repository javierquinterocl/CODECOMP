import { rutaApi } from './apiBase';

const URL_DATOS = rutaApi('datos');
const URL_ABRIR = rutaApi('actividad/abrir');
const URL_RESUMEN = rutaApi('actividad/resumen');
const URL_CLASES = rutaApi('clases');
const URL_UNIRSE = rutaApi('clases/unirse');

const leer = async (response, porDefecto) => {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || porDefecto);
  return data;
};

const pedir = async (user, url, { cuerpo, ...extra } = {}) => fetch(url, {
  ...extra,
  method: cuerpo === undefined ? 'GET' : 'POST',
  headers: {
    Authorization: `Bearer ${await user.getIdToken()}`,
    ...(cuerpo === undefined ? {} : { 'Content-Type': 'application/json' }),
  },
  body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
});

/** `{ autorizado: true | false | null }`: null si aún no responde el aviso. */
export const getDatos = async (user) =>
  leer(await pedir(user, URL_DATOS), 'No se pudo consultar tu autorización.');

export const responderDatos = async (user, acepta) =>
  leer(await pedir(user, URL_DATOS, { cuerpo: { acepta } }), 'No se pudo guardar tu respuesta.');

/** Primera y última apertura de un problema. Si falla, el ejercicio sigue usable. */
export const registrarApertura = (user, problemNumber) =>
  pedir(user, URL_ABRIR, { cuerpo: { problem_number: problemNumber } }).catch(() => {});

/**
 * Resumen de actividad. Con `token` no espera a Firebase: sirve al cerrar la pestaña,
 * cuando ya no hay tiempo para promesas largas (keepalive).
 */
export const enviarResumen = (resumen, token) => fetch(URL_RESUMEN, {
  method: 'POST',
  keepalive: true,
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    segundos: resumen.segundos,
    pegados: resumen.pegados,
    caracteres_pegados: resumen.caracteres,
  }),
}).catch(() => {});

/** `{ docente, clases }`: las del docente con su código, o a las que pertenece el estudiante. */
export const getClases = async (user) =>
  leer(await pedir(user, URL_CLASES), 'No se pudieron cargar tus clases.');

export const unirseAClase = async (user, codigo) =>
  leer(await pedir(user, URL_UNIRSE, { cuerpo: { codigo } }), 'No se pudo entrar a la clase.');

export const crearClase = async (user, nombre) =>
  leer(await pedir(user, URL_CLASES, { cuerpo: { nombre } }), 'No se pudo crear la clase.');
