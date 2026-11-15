import { sendEmailVerification, sendPasswordResetEmail } from 'firebase/auth';
import { rutaApi } from './apiBase';
import { auth } from './firebaseConfig';

// Correos de recuperación y verificación con el diseño de CODECOMP (los manda la API).
// Si la API dice que no están configurados, se usan los correos de Firebase como antes.

const GENERICO = 'Si el correo tiene una cuenta en CODECOMP, te llegará un enlace en unos minutos. Revisa también la carpeta de spam.';

const llamar = async (ruta, { token, cuerpo } = {}) => {
  const respuesta = await fetch(rutaApi(ruta), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(cuerpo ?? {}),
  });
  const data = await respuesta.json().catch(() => ({}));
  return { ok: respuesta.ok, codigo: data.codigo, data };
};

/** Pide el enlace para cambiar la contraseña. Devuelve el mensaje para el estudiante. */
export const pedirRecuperacion = async (email) => {
  const r = await llamar('acceso/recuperar', { cuerpo: { email } });
  if (r.ok) return r.data.message || GENERICO;
  if (r.codigo === 'no-configurado') {
    // Firebase avisa si la cuenta no existe; el mensaje sigue siendo el mismo.
    await sendPasswordResetEmail(auth, email).catch((error) => {
      if (error?.code !== 'auth/user-not-found') throw error;
    });
    return GENERICO;
  }
  throw new Error(r.data.message || 'No se pudo enviar el correo. Intenta de nuevo.');
};

/** Pide el enlace para verificar el correo de quien tiene la sesión. */
export const pedirVerificacion = async (user) => {
  const r = await llamar('acceso/verificar', { token: await user.getIdToken() });
  if (r.ok) return r.data;
  if (r.codigo === 'no-configurado') {
    await sendEmailVerification(user);
    return { ok: true };
  }
  throw new Error(r.data.message || 'No se pudo enviar el correo. Intenta de nuevo.');
};
