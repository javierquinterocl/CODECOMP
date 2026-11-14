// Racha: dias seguidos con al menos un envio (Problemas o Fundamentos), en la zona del proyecto.
// Si hoy aun no hay envio, la racha sigue viva desde ayer.

import type { Sql } from './db.ts';
import { dia } from './config.ts';

const MS_DIA = 86_400_000;
const restarDia = (dia: string): string =>
  new Date(Date.parse(`${dia}T00:00:00Z`) - MS_DIA).toISOString().slice(0, 10);

/** `dias` en formato AAAA-MM-DD (en cualquier orden, con o sin repetidos); `hoy` igual. */
export const rachaDe = (dias: string[], hoy: string): number => {
  const con = new Set(dias);
  let actual = con.has(hoy) ? hoy : restarDia(hoy);
  let racha = 0;
  while (con.has(actual)) {
    racha++;
    actual = restarDia(actual);
  }
  return racha;
};

/** La racha mas larga entre los dias dados (para los logros). */
export const rachaMaxima = (dias: string[]): number => {
  const ordenados = [...new Set(dias)].sort();
  let mejor = 0;
  let actual = 0;
  ordenados.forEach((d, i) => {
    actual = i > 0 && restarDia(d) === ordenados[i - 1] ? actual + 1 : 1;
    mejor = Math.max(mejor, actual);
  });
  return mejor;
};

/** Racha del estudiante, la mas larga y si hoy ya envio algo. */
export const rachaDelUsuario = async (sql: Sql, userId: string, zona: string) => {
  const filas = await sql`
    SELECT DISTINCT (created_at AT TIME ZONE ${zona})::date::text AS dia FROM submissions
    WHERE user_id = ${userId} AND verdict NOT IN ('PENDING', 'ERROR_JUEZ')
      AND created_at > now() - INTERVAL '400 days'
    UNION
    SELECT DISTINCT (creado_en AT TIME ZONE ${zona})::date::text FROM fundamentos_envios
    WHERE user_id = ${userId} AND creado_en > now() - INTERVAL '400 days'
  `;
  const dias = filas.map((f) => f.dia as string);
  const hoy = dia(zona);
  return { racha: rachaDe(dias, hoy), maxima: rachaMaxima(dias), envioHoy: dias.includes(hoy) };
};
