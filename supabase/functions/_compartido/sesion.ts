// Cookie de sesion cifrada (S7): AES-GCM con la llave SESION_LLAVE, solo para la actividad.
// Lleva la identidad ya verificada con el token de Firebase y una fecha de vencimiento.

import type { Identidad } from './auth.ts';

export const NOMBRE_COOKIE = '__Host-cc_sesion';
export const DURACION_SEGUNDOS = 8 * 60 * 60;

const codificar = new TextEncoder();
const decodificar = new TextDecoder();

const aBase64Url = (bytes: Uint8Array): string =>
  btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const deBase64 = (texto: string): Uint8Array<ArrayBuffer> => {
  const limpio = texto.replace(/-/g, '+').replace(/_/g, '/');
  const relleno = limpio + '='.repeat((4 - (limpio.length % 4)) % 4);
  return Uint8Array.from(atob(relleno), (c) => c.charCodeAt(0));
};

/** La llave son 32 bytes en base64; sin llave valida no hay cookie (null). */
export const llaveDe = async (base64: string): Promise<CryptoKey | null> => {
  try {
    const bytes = deBase64(base64);
    if (bytes.length !== 32) return null;
    return await crypto.subtle.importKey('raw', bytes, 'AES-GCM', false, ['encrypt', 'decrypt']);
  } catch {
    return null;
  }
};

export const sellar = async (
  identidad: Identidad,
  llave: CryptoKey,
  ahora = Date.now(),
): Promise<string> => {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const datos = codificar.encode(JSON.stringify({ ...identidad, vence: ahora + DURACION_SEGUNDOS * 1000 }));
  const cifrado = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, llave, datos));
  const todo = new Uint8Array(iv.length + cifrado.length);
  todo.set(iv);
  todo.set(cifrado, iv.length);
  return aBase64Url(todo);
};

/** null si fue alterada, se cifro con otra llave o ya vencio. */
export const abrir = async (
  valor: string,
  llave: CryptoKey,
  ahora = Date.now(),
): Promise<Identidad | null> => {
  try {
    const bytes = deBase64(valor);
    const claro = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: bytes.slice(0, 12) },
      llave,
      bytes.slice(12),
    );
    const { vence, ...identidad } = JSON.parse(decodificar.decode(claro));
    if (typeof vence !== 'number' || vence <= ahora || typeof identidad.uid !== 'string') return null;
    return identidad as Identidad;
  } catch {
    return null;
  }
};

export const cookieDe = (req: Request, nombre = NOMBRE_COOKIE): string | null => {
  for (const parte of (req.headers.get('cookie') ?? '').split(';')) {
    const [clave, ...resto] = parte.trim().split('=');
    if (clave === nombre) return resto.join('=') || null;
  }
  return null;
};

// __Host-: sin Domain, Path=/ y Secure; HttpOnly para que el JavaScript no la lea.
export const setCookie = (valor: string): string =>
  `${NOMBRE_COOKIE}=${valor}; Max-Age=${DURACION_SEGUNDOS}; Path=/; Secure; HttpOnly; SameSite=Lax`;

export const borrarCookie = (): string =>
  `${NOMBRE_COOKIE}=; Max-Age=0; Path=/; Secure; HttpOnly; SameSite=Lax`;
