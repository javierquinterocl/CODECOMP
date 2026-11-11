// Datos de competencias en Postgres: quien compite donde y la reserva de problemas del banco.
import type { TransactionSql } from 'npm:postgres@3.4.5';
import type { Sql } from './db.ts';

type Consulta = Sql | TransactionSql;

export interface EquipoDeEstudiante {
  team_id: string;
  cid: string;
  nombre: string;
  retirado: boolean;
}

/** Equipos del estudiante en competencias no archivadas (uno por competencia). */
export const equiposDelEstudiante = async (sql: Sql, userId: string): Promise<EquipoDeEstudiante[]> =>
  await sql<EquipoDeEstudiante[]>`
    SELECT e.team_id, e.cid, e.nombre, e.retirado
    FROM competencia_miembros m
    JOIN competencia_equipos e ON e.team_id = m.team_id AND e.cid = m.cid
    JOIN competencias c ON c.cid = e.cid
    WHERE m.user_id = ${userId} AND NOT c.archivada
  `;

/** Equipos que cuentan en el marcador del concurso: team_id -> nombre. */
export const equiposDelConcurso = async (sql: Sql, cid: string): Promise<Map<string, string>> => {
  const filas = await sql<{ team_id: string; nombre: string }[]>`
    SELECT team_id, nombre FROM competencia_equipos WHERE cid = ${cid} AND NOT retirado
  `;
  return new Map(filas.map((f) => [f.team_id, f.nombre]));
};

/** Oculta del banco de practica un problema que entra a una competencia. */
export const reservarProblema = async (tx: Consulta, problemId: string) => {
  await tx`
    UPDATE problems SET is_active = false,
      deactivation_reasons = CASE WHEN 'torneo' = ANY(deactivation_reasons)
        THEN deactivation_reasons ELSE array_append(deactivation_reasons, 'torneo') END
    WHERE id = ${problemId}
  `;
};

/**
 * Devuelve el problema al banco si ninguna otra competencia sin liberar lo usa. Vuelve a estar
 * activo solo si no le quedan otros motivos de desactivacion.
 */
export const liberarProblema = async (tx: Consulta, problemId: string) => {
  await tx`
    UPDATE problems SET
      deactivation_reasons = array_remove(deactivation_reasons, 'torneo'),
      is_active = cardinality(array_remove(deactivation_reasons, 'torneo')) = 0
    WHERE id = ${problemId}
      AND 'torneo' = ANY(deactivation_reasons)
      AND NOT EXISTS (
        SELECT 1 FROM competencia_problemas cp
        WHERE cp.problem_id = ${problemId} AND NOT cp.liberado
      )
  `;
};
