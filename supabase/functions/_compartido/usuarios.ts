

import type { Sql } from './db.ts';
import { emailDe, type Identidad, usernameDe } from './auth.ts';

export const idDeUsuario = async (sql: Sql, identidad: Identidad): Promise<string> => {
  const email = emailDe(identidad);

  // La cookie de sesion no trae la verificacion: sin el dato, no se toca.
  const verificado = typeof identidad.emailVerificado === 'boolean'
    ? identidad.emailVerificado
    : null;

  const [existente] = await sql`
    SELECT id, email, correo_verificado FROM users WHERE firebase_uid = ${identidad.uid}
  `;

  if (existente) {
    const cambiaVerificado = verificado !== null && existente.correo_verificado !== verificado;
    if (existente.email !== email || cambiaVerificado) {
      await sql`
        UPDATE users SET email = ${email},
          correo_verificado = ${verificado ?? existente.correo_verificado}
        WHERE id = ${existente.id}
      `;
    }
    return existente.id as string;
  }

  const [creado] = await sql`
    INSERT INTO users (firebase_uid, username, email, correo_verificado)
    VALUES (${identidad.uid}, ${usernameDe(identidad)}, ${email}, ${verificado ?? false})
    ON CONFLICT (firebase_uid) DO UPDATE SET email = EXCLUDED.email
    RETURNING id
  `;
  return creado.id as string;
};
