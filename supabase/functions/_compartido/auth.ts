// Verifica el ID token de Firebase sin firebase-admin: firma RS256 contra el
// JWKS publico de Google. Offline, jose cachea las claves.

import { createRemoteJWKSet, jwtVerify } from 'npm:jose@5.9.6';

const JWKS_URL = new URL(
  'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com',
);

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

const claves = () => {
  if (!jwks) jwks = createRemoteJWKSet(JWKS_URL);
  return jwks;
};

export interface Identidad {
  uid: string;
  email: string | null;
  nombre: string | null;
}

// Nunca lanza: un token invalido es 401, no 500.
export const identidadDelToken = async (
  token: string | null,
  projectId: string,
): Promise<Identidad | null> => {
  if (!token || !projectId) return null;
  try {
    const { payload } = await jwtVerify(token, claves(), {
      issuer: `https://securetoken.google.com/${projectId}`,
      audience: projectId,
      algorithms: ['RS256'],
    });
    const uid = typeof payload.sub === 'string' ? payload.sub : '';
    if (!uid) return null;
    return {
      uid,
      email: typeof payload.email === 'string' ? payload.email : null,
      nombre: typeof payload.name === 'string' ? payload.name : null,
    };
  } catch {
    return null;
  }
};

// Mismo criterio que functions/index.js, para no romper filas ya creadas.
export const usernameDe = (identidad: Identidad): string => {
  const base = (identidad.nombre ?? 'student').replace(/[^a-zA-Z0-9]/g, '').slice(0, 42);
  return `${base}-${identidad.uid.slice(-7)}`;
};

export const emailDe = (identidad: Identidad): string =>
  identidad.email ?? `${identidad.uid}@firebase.local`;
