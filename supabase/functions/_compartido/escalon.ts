// Escalones de practica (S4): los 5 niveles de dificultad que ya muestra la plataforma.
// Bloqueo suave: el escalon solo marca y filtra recomendaciones; nunca impide enviar.

import type { Sql } from './db.ts';

export const RESUELTOS_PARA_SUBIR = 5;

/** Igual que nivelDeRating del frontend: 800-1100 -> 1, ..., 2301+ -> 5. */
export const escalonDeRating = (rating: number): number =>
  Math.min(5, Math.max(1, Math.ceil(((Number(rating) || 1200) - 700) / 400)));

export interface Escalon {
  actual: number;
  porNivel: number;
  porResueltos: number;
  minimo: number;
  resueltosEnActual: number;
  /** Nivel real con el que se pasa al siguiente escalon; null en el ultimo. */
  nivelParaSubir: number | null;
}

/** Lo que pase primero: nivel real, 5 resueltos del escalon o el minimo que fijo el docente. */
export const escalonDe = (
  nivel: number,
  resueltosPorEscalon: Record<number, number>,
  minimo = 1,
): Escalon => {
  const porNivel = escalonDeRating(nivel);
  let porResueltos = 1;
  while (porResueltos < 5 && (resueltosPorEscalon[porResueltos] ?? 0) >= RESUELTOS_PARA_SUBIR) {
    porResueltos++;
  }
  const piso = Math.min(5, Math.max(1, Math.trunc(minimo) || 1));
  const actual = Math.max(porNivel, porResueltos, piso);
  return {
    actual,
    porNivel,
    porResueltos,
    minimo: piso,
    resueltosEnActual: resueltosPorEscalon[actual] ?? 0,
    nivelParaSubir: actual < 5 ? 700 + 400 * actual + 1 : null,
  };
};

export const escalonDelUsuario = async (sql: Sql, userId: string): Promise<Escalon> => {
  const [usuario] = await sql`SELECT nivel, escalon_minimo FROM users WHERE id = ${userId}`;
  const filas = await sql`
    SELECT LEAST(5, GREATEST(1, ceil((p.difficulty_rating - 700) / 400.0)))::int AS escalon,
      count(DISTINCT s.problem_id)::int AS resueltos
    FROM submissions s JOIN problems p ON p.id = s.problem_id
    WHERE s.user_id = ${userId} AND s.verdict = 'ACCEPTED'
    GROUP BY 1
  `;
  return escalonDe(
    Number(usuario?.nivel ?? 1000),
    Object.fromEntries(filas.map((f) => [f.escalon, f.resueltos])),
    Number(usuario?.escalon_minimo ?? 1),
  );
};
