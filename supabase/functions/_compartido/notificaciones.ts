// Notificaciones guardadas en la cuenta: alta idempotente por clave y calculos de fechas del cron.

import type { Sql } from './db.ts';
import { dia } from './config.ts';

export interface NuevaNotificacion {
  userId: string;
  tipo: string;
  clave: string;
  datos?: Record<string, unknown>;
}

// Los unicos que tambien van por correo (decidido por el equipo); los demas, solo campana.
export const TIPOS_CON_CORREO = new Set(['docente', 'competencia_1d', 'cierre_1d', 'resumen_semanal']);

// Los que el frontend sabe mostrar: el contador de no leidos solo cuenta estos.
export const TIPOS_CONOCIDOS = [
  'racha', 'cierre', 'alertas', 'nuevos', 'resuelto', 'escalon', 'jurado', 'docente',
  'competencia_1d', 'competencia_1h', 'cierre_1d', 'resumen_semanal', 'borrado',
];

/**
 * Crea o actualiza avisos por (usuario, clave). Si ya existe y los datos no cambiaron, no
 * escribe nada. Devuelve cuantas filas se crearon o cambiaron.
 */
export const notificar = async (sql: Sql, filas: NuevaNotificacion[]): Promise<number> => {
  if (!filas.length) return 0;
  const hechas = await sql`
    INSERT INTO notificaciones (user_id, tipo, clave, datos, correo)
    SELECT t.u::uuid, t.tipo, t.clave, t.datos::jsonb, NULLIF(t.correo, '')
    FROM unnest(
      ${filas.map((f) => f.userId)}::text[],
      ${filas.map((f) => f.tipo)}::text[],
      ${filas.map((f) => f.clave)}::text[],
      ${filas.map((f) => JSON.stringify(f.datos ?? {}))}::text[],
      ${filas.map((f) => (TIPOS_CON_CORREO.has(f.tipo) ? 'pendiente' : ''))}::text[]
    ) AS t(u, tipo, clave, datos, correo)
    ON CONFLICT (user_id, clave) DO UPDATE SET datos = EXCLUDED.datos, actualizada_en = now()
    WHERE notificaciones.datos IS DISTINCT FROM EXCLUDED.datos
    RETURNING id
  `;
  return hechas.length;
};

/** Igual que `notificar`, pero un fallo solo queda en el log: un aviso nunca rompe la accion. */
export const notificarSinFallar = async (sql: Sql, filas: NuevaNotificacion[]): Promise<void> => {
  try {
    await notificar(sql, filas);
  } catch (error) {
    console.error('No se pudieron crear avisos:', error);
  }
};

/** Semana ISO de una fecha `YYYY-MM-DD`, como `2026-W46`. */
export const semanaIso = (fecha: string): string => {
  const d = new Date(`${fecha}T00:00:00Z`);
  // El jueves de esa semana decide el anio.
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const inicioAnio = Date.UTC(d.getUTCFullYear(), 0, 1);
  const semana = Math.ceil(((d.getTime() - inicioAnio) / 86_400_000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(semana).padStart(2, '0')}`;
};

/** Hora (0 a 23) y dia de la semana (0 = domingo) en la zona del proyecto. */
export const relojEn = (zona: string, ahora: Date) => {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: zona,
    hour: 'numeric',
    hourCycle: 'h23',
    weekday: 'short',
  }).formatToParts(ahora);
  const hora = Number(partes.find((p) => p.type === 'hour')?.value ?? 0);
  const nombre = partes.find((p) => p.type === 'weekday')?.value ?? 'Sun';
  return { hora, diaSemana: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(nombre), fecha: dia(zona, ahora) };
};

const MS_HORA = 3_600_000;

/** Que recordatorio toca para una competencia: '1h' en la ultima hora, '1d' en las 23 anteriores. */
export const recordatorioDe = (inicio: Date, ahora: Date): '1d' | '1h' | null => {
  const falta = inicio.getTime() - ahora.getTime();
  if (falta <= 0) return null;
  if (falta <= MS_HORA) return '1h';
  if (falta <= 24 * MS_HORA) return '1d';
  return null;
};

/** Al mover la hora de una competencia, retira los recordatorios sin leer de la hora anterior. */
export const retirarRecordatorios = (sql: Sql, cid: string, inicio: Date) =>
  sql`
    DELETE FROM notificaciones
    WHERE tipo IN ('competencia_1d', 'competencia_1h') AND leida_en IS NULL
      AND datos->>'cid' = ${cid} AND datos->>'inicio' IS DISTINCT FROM ${inicio.toISOString()}
  `;

/** Huella corta y estable de un texto (para claves de avisos). */
export const huellaCorta = async (texto: string): Promise<string> => {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto));
  return [...new Uint8Array(bytes)].slice(0, 8).map((b) => b.toString(16).padStart(2, '0')).join('');
};
