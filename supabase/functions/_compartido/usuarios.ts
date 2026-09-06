

import type { Sql } from './db.ts';
import { emailDe, type Identidad, usernameDe } from './auth.ts';

export const idDeUsuario = async (sql: Sql, identidad: Identidad): Promise<string> => {
  const email = emailDe(identidad);

  const [existente] = await sql`
    SELECT id, email FROM users WHERE firebase_uid = ${identidad.uid}
  `;

  if (existente) {
    if (existente.email !== email) {
      await sql`UPDATE users SET email = ${email} WHERE id = ${existente.id}`;
    }
    return existente.id as string;
  }

  const [creado] = await sql`
    INSERT INTO users (firebase_uid, username, email)
    VALUES (${identidad.uid}, ${usernameDe(identidad)}, ${email})
    ON CONFLICT (firebase_uid) DO UPDATE SET email = EXCLUDED.email
    RETURNING id
  `;
  return creado.id as string;
};
