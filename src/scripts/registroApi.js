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

// La cookie cifrada solo sirve si la API es del mismo sitio y va por HTTPS
// (codecomp.online y api.codecomp.online). Si no, el navegador la trataría como de terceros.
const dominio = (host) => host.split('.').slice(-2).join('.');
export const USA_COOKIE = (() => {
  try {
    const api = new URL(URL_RESUMEN, window.location.href);
    return api.protocol === 'https:' && dominio(api.hostname) === dominio(window.location.hostname);
  } catch {
    return false;
  }
})();

const URL_SESION = rutaApi('sesion');

/** Emite (o renueva) la cookie de actividad con el token de Firebase. */
export const abrirSesionCookie = async (user) => {
  if (!USA_COOKIE) return false;
  const response = await fetch(URL_SESION, {
    method: 'POST',
    credentials: 'include',
    headers: { Authorization: `Bearer ${await user.getIdToken()}` },
  }).catch(() => null);
  return Boolean(response?.ok);
};

/** Borra la cookie al cerrar sesión. */
export const cerrarSesionCookie = () => {
  if (!USA_COOKIE) return;
  fetch(URL_SESION, { method: 'DELETE', credentials: 'include', keepalive: true }).catch(() => {});
};

/**
 * Resumen de actividad. Con cookie va por sendBeacon (sobrevive al cierre de la pestaña);
 * sin ella, con el `token` ya pedido y keepalive.
 */
export const enviarResumen = (resumen, token) => {
  const cuerpo = JSON.stringify({
    segundos: resumen.segundos,
    pegados: resumen.pegados,
    caracteres_pegados: resumen.caracteres,
  });
  if (USA_COOKIE && navigator.sendBeacon?.(URL_RESUMEN, new Blob([cuerpo], { type: 'text/plain' }))) {
    return;
  }
  if (!token) return;
  fetch(URL_RESUMEN, {
    method: 'POST',
    keepalive: true,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: cuerpo,
  }).catch(() => {});
};

/** `{ docente, clases }`: las del docente con su código, o a las que pertenece el estudiante. */
export const getClases = async (user) =>
  leer(await pedir(user, URL_CLASES), 'No se pudieron cargar tus clases.');

export const unirseAClase = async (user, codigo) =>
  leer(await pedir(user, URL_UNIRSE, { cuerpo: { codigo } }), 'No se pudo entrar a la clase.');

/** Nivel, evolución, temas, pendientes, actividad y autorización del propio estudiante. */
export const getMiProgreso = async (user) =>
  leer(await pedir(user, rutaApi('mi-progreso')), 'No se pudo cargar tu progreso.');

export const crearClase = async (user, nombre) =>
  leer(await pedir(user, URL_CLASES, { cuerpo: { nombre } }), 'No se pudo crear la clase.');
