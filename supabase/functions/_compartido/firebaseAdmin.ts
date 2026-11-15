// Enlaces de recuperacion y verificacion generados con la cuenta de servicio de Firebase.
// Nunca se imprime la llave, el token ni el codigo de un enlace.

export interface CuentaServicio {
  client_email: string;
  private_key: string;
  project_id: string;
}

export type TipoEnlace = 'PASSWORD_RESET' | 'VERIFY_EMAIL';

const ALCANCE = 'https://www.googleapis.com/auth/identitytoolkit';
const URL_TOKEN = 'https://oauth2.googleapis.com/token';

/** La cuenta de servicio del secreto, o null si falta o esta incompleta. */
export const leerCuentaServicio = (json: string): CuentaServicio | null => {
  if (!json) return null;
  try {
    const c = JSON.parse(json);
    return c?.client_email && c?.private_key && c?.project_id ? c : null;
  } catch {
    return null;
  }
};

const base64url = (datos: ArrayBuffer | Uint8Array | string) => {
  const bytes = typeof datos === 'string' ? new TextEncoder().encode(datos) : new Uint8Array(datos);
  let binario = '';
  for (const b of bytes) binario += String.fromCharCode(b);
  return btoa(binario).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const llavePrivada = (pem: string) => {
  const cuerpo = pem.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  const der = Uint8Array.from(atob(cuerpo), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey(
    'pkcs8',
    der,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
};

/** JWT firmado (RS256) que Google cambia por un token de acceso. Dura 1 hora. */
export const firmarJwt = async (cuenta: CuentaServicio, ahora = Math.floor(Date.now() / 1000)) => {
  const cabecera = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const cuerpo = base64url(JSON.stringify({
    iss: cuenta.client_email,
    scope: ALCANCE,
    aud: URL_TOKEN,
    iat: ahora - 30,
    exp: ahora + 3600 - 30,
  }));
  const firma = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    await llavePrivada(cuenta.private_key),
    new TextEncoder().encode(`${cabecera}.${cuerpo}`),
  );
  return `${cabecera}.${cuerpo}.${base64url(firma)}`;
};

// Token en memoria de la instancia; se renueva 5 minutos antes de vencer y una sola vez a la vez.
let enCache: { token: string; vence: number } | null = null;
let enVuelo: Promise<string> | null = null;

const pedirToken = async (cuenta: CuentaServicio, pedir: typeof fetch): Promise<string> => {
  const res = await pedir(URL_TOKEN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: await firmarJwt(cuenta),
    }),
    signal: AbortSignal.timeout(10000),
  });
  const datos = await res.json().catch(() => ({}));
  if (!res.ok || typeof datos.access_token !== 'string') {
    throw new Error(`Google no entrego el token (${res.status})`);
  }
  enCache = { token: datos.access_token, vence: Date.now() + (Number(datos.expires_in) || 3600) * 1000 };
  return datos.access_token;
};

export const tokenDeAcceso = (cuenta: CuentaServicio, pedir: typeof fetch = fetch) => {
  if (enCache && enCache.vence - Date.now() > 5 * 60 * 1000) return Promise.resolve(enCache.token);
  enVuelo ??= pedirToken(cuenta, pedir).finally(() => {
    enVuelo = null;
  });
  return enVuelo;
};

/** Solo para tests. */
export const olvidarToken = () => {
  enCache = null;
  enVuelo = null;
};

/** El oobCode de un enlace de Firebase, o null si no trae uno valido. */
export const codigoDeEnlace = (enlace: unknown): string | null => {
  if (typeof enlace !== 'string') return null;
  try {
    const codigo = new URL(enlace).searchParams.get('oobCode');
    return codigo && /^[A-Za-z0-9_-]{10,}$/.test(codigo) ? codigo : null;
  } catch {
    return null;
  }
};

/** Enlace a la pagina propia `/accion` con el codigo (solo a partir de APP_URL). */
export const enlacePropio = (appUrl: string, tipo: TipoEnlace, codigo: string) =>
  `${appUrl}/accion?mode=${tipo === 'PASSWORD_RESET' ? 'resetPassword' : 'verifyEmail'}&oobCode=${
    encodeURIComponent(codigo)
  }`;

/**
 * Pide a Firebase el codigo de un solo uso sin que Firebase mande su correo.
 * null si la cuenta no existe o no puede recibirlo; error si Google fallo.
 */
export const codigoDeAccion = async (
  cuenta: CuentaServicio,
  tipo: TipoEnlace,
  email: string,
  ip: string | null,
  pedir: typeof fetch = fetch,
): Promise<string | null> => {
  const token = await tokenDeAcceso(cuenta, pedir);
  const res = await pedir(
    `https://identitytoolkit.googleapis.com/v1/projects/${cuenta.project_id}/accounts:sendOobCode`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requestType: tipo,
        email,
        returnOobLink: true,
        ...(ip ? { userIp: ip } : {}),
      }),
      signal: AbortSignal.timeout(10000),
    },
  );
  const datos = await res.json().catch(() => ({}));
  if (!res.ok) {
    const motivo = String(datos?.error?.message ?? '');
    if (/EMAIL_NOT_FOUND|USER_NOT_FOUND|USER_DISABLED/.test(motivo)) return null;
    throw new Error(`Firebase rechazo el enlace (${res.status} ${motivo.slice(0, 40)})`);
  }
  const codigo = codigoDeEnlace(datos.oobLink);
  if (!codigo) throw new Error('Firebase no devolvio un enlace valido');
  return codigo;
};
