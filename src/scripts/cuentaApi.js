import { rutaApi } from './apiBase';

const leer = async (response, porDefecto) => {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(data.message || porDefecto), { codigo: data.codigo });
  return data;
};

const pedir = async (user, ruta, { metodo = 'GET', cuerpo, tipo } = {}) => fetch(rutaApi(ruta), {
  method: metodo,
  headers: { Authorization: `Bearer ${await user.getIdToken()}`, ...(tipo ? { 'Content-Type': tipo } : {}) },
  body: cuerpo,
});

/** Logros, versión de la foto, competencias, solicitud de borrado y, para el docente, su panel. */
export const getCuenta = async (user) => leer(await pedir(user, 'cuenta'), 'No se pudo cargar tu cuenta.');

/** Recorta al centro, reduce a 256×256 y codifica en JPEG (también quita el EXIF, con el GPS). */
export const prepararFoto = (archivo) => new Promise((resolve, reject) => {
  const url = URL.createObjectURL(archivo);
  const img = new Image();
  img.onload = () => {
    const lado = Math.min(img.naturalWidth, img.naturalHeight);
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    canvas.getContext('2d').drawImage(
      img, (img.naturalWidth - lado) / 2, (img.naturalHeight - lado) / 2, lado, lado, 0, 0, 256, 256,
    );
    URL.revokeObjectURL(url);
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('No se pudo leer la imagen.'))), 'image/jpeg', 0.8);
  };
  img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Ese archivo no es una imagen válida.')); };
  img.src = url;
});

export const subirFoto = async (user, blob) =>
  leer(await pedir(user, 'cuenta/foto?consentimiento=1', { metodo: 'POST', cuerpo: blob, tipo: 'image/jpeg' }), 'No se pudo subir la foto.');

export const quitarFoto = async (user) => leer(await pedir(user, 'cuenta/foto', { metodo: 'DELETE' }), 'No se pudo quitar la foto.');

// Las fotos se piden con el token; cada una se guarda en memoria como blob URL una sola vez.
const fotos = new Map();

/** blob URL de la foto de un usuario (`'yo'` = la propia) o null si no tiene o no se puede ver. */
export const urlDeFoto = (user, userId, version = '') => {
  const clave = `${userId}:${version}`;
  if (!fotos.has(clave)) {
    fotos.set(clave, (async () => {
      const r = await pedir(user, `cuenta/foto/${userId}?v=${encodeURIComponent(version)}`);
      return r.ok ? URL.createObjectURL(await r.blob()) : null;
    })().catch(() => null));
  }
  return fotos.get(clave);
};

/** Olvida las fotos guardadas en memoria (al cambiar la propia o al salir). */
export const olvidarFotos = () => {
  for (const promesa of fotos.values()) promesa.then((url) => url && URL.revokeObjectURL(url));
  fotos.clear();
};

export const cerrarSesiones = async (user) =>
  leer(await pedir(user, 'cuenta/cerrar-sesiones', { metodo: 'POST' }), 'No se pudieron cerrar las sesiones.');

export const getMisDatos = async (user) => leer(await pedir(user, 'cuenta/datos'), 'No se pudieron descargar tus datos.');

export const pedirBorrado = async (user) =>
  leer(await pedir(user, 'cuenta/borrado', { metodo: 'POST' }), 'No se pudo enviar la solicitud.');

export const cancelarBorrado = async (user) =>
  leer(await pedir(user, 'cuenta/borrado', { metodo: 'DELETE' }), 'No se pudo cancelar la solicitud.');

export const ejecutarBorrado = async (user, solicitudId) =>
  leer(await pedir(user, `cuenta/borrado/${solicitudId}/ejecutar`, { metodo: 'POST' }), 'No se pudo ejecutar el borrado.');
