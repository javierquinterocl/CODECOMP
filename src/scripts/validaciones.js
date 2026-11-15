// Validaciones de los formularios: una sola fuente para registro, perfil, cuenta y contraseña.
// Cada mensaje dice qué poner, con un ejemplo. Textos borrador: los decide el equipo.
import { errorDeCodigo, LARGO_CODIGO } from './codigoUfpso.js';

export { errorDeCodigo, LARGO_CODIGO };

const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Error del nombre o apellido (`campo` es "nombre" o "apellido"), o null. */
export const errorDeNombre = (valor, campo = 'nombre') => {
  const v = String(valor ?? '').trim();
  if (!v) return `Escribe tu ${campo}, por ejemplo ${campo === 'apellido' ? '«Pérez»' : '«Ana»'}.`;
  if (v.length > 50) return `Tu ${campo} puede tener hasta 50 caracteres.`;
  return null;
};

/** Error del correo, o null. */
export const errorDeCorreo = (valor) => {
  const v = String(valor ?? '').trim();
  if (!v) return 'Escribe tu correo, por ejemplo nombre@ufpso.edu.co.';
  if (v.length > 254) return 'El correo puede tener hasta 254 caracteres.';
  if (!CORREO.test(v)) return 'Ese correo no parece válido: revisa la @ y el dominio, como en nombre@ufpso.edu.co.';
  return null;
};

/** Requisitos de una contraseña nueva, para mostrarlos en vivo mientras se escribe. */
export const requisitosContrasena = (pass = '') => [
  { texto: 'Al menos 10 caracteres', cumple: pass.length >= 10 },
  { texto: 'Una letra mayúscula', cumple: /[A-Z]/.test(pass) },
  { texto: 'Una letra minúscula', cumple: /[a-z]/.test(pass) },
  { texto: 'Un número', cumple: /[0-9]/.test(pass) },
  { texto: 'Un carácter especial, como ! ? # o *', cumple: /[^A-Za-z0-9]/.test(pass) },
];

/** Error de una contraseña nueva, o null. */
export const errorDeContrasena = (pass) => {
  if (!pass) return 'Escribe una contraseña nueva.';
  const faltan = requisitosContrasena(pass).filter((r) => !r.cumple);
  return faltan.length ? `A tu contraseña le falta: ${faltan.map((r) => r.texto.toLowerCase()).join(', ')}.` : null;
};

/** Error de la confirmación de contraseña, o null. */
export const errorDeConfirmacion = (pass, confirmacion) => {
  if (!confirmacion) return 'Vuelve a escribir la contraseña para confirmarla.';
  return confirmacion === pass ? null : 'Las dos contraseñas no coinciden: escríbelas igual.';
};

/** Errores de todos los campos con un validador; los vacíos no se incluyen. */
export const erroresDe = (valores, validadores) => Object.fromEntries(
  Object.entries(validadores)
    .map(([campo, validar]) => [campo, validar(valores[campo], valores)])
    .filter(([, error]) => error),
);
