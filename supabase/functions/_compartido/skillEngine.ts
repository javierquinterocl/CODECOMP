// Procesa el veredicto de un envio: contadores, dominio por tema y nivel real (nivel.ts).
// Desde la migracion 016 ya no replica a functions/services/skillEngine.js (codigo heredado).

import type { TransactionSql } from 'npm:postgres@3.4.5';
import type { Sql } from './db.ts';
import { calcularNivel } from './nivel.ts';

export const VEREDICTOS = new Set([
  'ACCEPTED',
  'WRONG_ANSWER',
  'TIME_LIMIT_EXCEEDED',
  'RUNTIME_ERROR',
  'COMPILATION_ERROR',
]);

export interface Procesado {
  submission_id: string;
  verdict: string;
  rating_change: number;
  first_solve: boolean;
  /** Envios evaluados de este problema, contando este (sin errores del juez). */
  intento?: number;
}

/**
 * Recalcula el nivel del estudiante con todo su historial y guarda sus resultados.
 * Devuelve el cambio de nivel que produjo cada envio.
 */
export const actualizarNivel = async (
  tx: TransactionSql,
  userId: string,
): Promise<Map<string, number>> => {
  const envios = await tx`
    SELECT s.id, s.problem_id, s.verdict, s.processed_at, md5(s.source_code) AS hash,
      p.difficulty_rating
    FROM submissions s JOIN problems p ON p.id = s.problem_id
    WHERE s.user_id = ${userId} AND s.processed_at IS NOT NULL
      AND s.verdict NOT IN ('PENDING', 'ERROR_JUEZ')
  `;
  const pistas = await tx`SELECT problem_id, creado_en FROM pistas WHERE user_id = ${userId}`;

  const { nivel, resultados } = calcularNivel(
    envios.map((e) => ({
      id: e.id as string,
      problemaId: e.problem_id as string,
      veredicto: e.verdict as string,
      procesado: e.processed_at as Date,
      hashCodigo: e.hash as string,
      dificultad: e.difficulty_rating as number,
    })),
    pistas.map((p) => ({ problemaId: p.problem_id as string, creada: p.creado_en as Date })),
  );

  await tx`DELETE FROM resultados_problema WHERE user_id = ${userId}`;
  if (resultados.length) {
    const filas = resultados.map((r) => ({
      user_id: userId,
      problem_id: r.problemaId,
      submission_id: r.envioId,
      aceptado: r.aceptado,
      puntaje: r.puntaje,
      esperado: r.esperado,
      cambio: r.cambio,
      nivel_despues: r.nivelDespues,
      cerrado_en: r.cerradoEn,
    }));
    await tx`INSERT INTO resultados_problema ${tx(filas)}`;
  }
  await tx`
    UPDATE users SET nivel = ${nivel}, global_rating = ${Math.max(0, Math.round(nivel))}
    WHERE id = ${userId}
  `;

  const porEnvio = new Map<string, number>();
  for (const r of resultados) if (r.envioId) porEnvio.set(r.envioId, r.cambio);
  return porEnvio;
};

export const procesarResultado = async (
  sql: Sql,
  submissionId: string,
  veredicto: string,
): Promise<Procesado> => {
  if (!VEREDICTOS.has(veredicto)) {
    throw new Error('El veredicto del juez no es valido para procesar.');
  }

  return await sql.begin(async (tx) => {
    const [envio] = await tx`SELECT * FROM submissions WHERE id = ${submissionId} FOR UPDATE`;
    if (!envio) throw new Error('Envio no encontrado.');

    // Idempotente: si ya se proceso, no vuelve a puntuar.
    if (envio.processed_at) {
      return {
        submission_id: envio.id as string,
        verdict: envio.verdict as string,
        rating_change: envio.rating_change as number,
        first_solve: false,
      };
    }

    // El bloqueo del usuario ordena sus envios simultaneos.
    await tx`SELECT id FROM users WHERE id = ${envio.user_id} FOR UPDATE`;

    const [yaResuelto] = await tx`
      SELECT id FROM submissions
      WHERE user_id = ${envio.user_id} AND problem_id = ${envio.problem_id}
        AND verdict = 'ACCEPTED' AND id <> ${submissionId}
      LIMIT 1
    `;
    const repetido = veredicto === 'ACCEPTED' && Boolean(yaResuelto);
    const primerAcierto = veredicto === 'ACCEPTED' && !yaResuelto;

    await tx`
      UPDATE submissions
      SET verdict = ${veredicto}::submission_verdict, processed_at = now()
      WHERE id = ${submissionId}
    `;

    // Un aceptado repetido queda en el historial, pero no suma contadores ni dominio por tema.
    if (!repetido) {
      await tx`
        UPDATE users
        SET attempted_count = attempted_count + 1,
            solved_count = solved_count + ${primerAcierto ? 1 : 0}
        WHERE id = ${envio.user_id}
      `;

      const exito = veredicto === 'ACCEPTED' ? 1 : 0;
      await tx`
        INSERT INTO user_tag_mastery (user_id, tag_id, attempts, successes, mastery_score)
        SELECT ${envio.user_id}, pt.tag_id, 1, ${exito},
               CASE WHEN ${exito} = 1 THEN 100.00 ELSE 0.00 END
        FROM problem_tags pt WHERE pt.problem_id = ${envio.problem_id}
        ON CONFLICT (user_id, tag_id) DO UPDATE SET
          attempts = user_tag_mastery.attempts + 1,
          successes = user_tag_mastery.successes + EXCLUDED.successes,
          mastery_score = ROUND((user_tag_mastery.successes + EXCLUDED.successes)::NUMERIC
            / (user_tag_mastery.attempts + 1) * 100, 2)
      `;
    }

    const cambios = await actualizarNivel(tx, envio.user_id as string);
    const cambio = Math.round(cambios.get(submissionId) ?? 0);
    await tx`UPDATE submissions SET rating_change = ${cambio} WHERE id = ${submissionId}`;
    const [{ intento }] = await tx`
      SELECT count(*)::int AS intento FROM submissions
      WHERE user_id = ${envio.user_id} AND problem_id = ${envio.problem_id}
        AND verdict NOT IN ('PENDING', 'ERROR_JUEZ')
    `;

    return {
      submission_id: submissionId,
      verdict: veredicto,
      rating_change: cambio,
      first_solve: primerAcierto,
      intento: intento as number,
    };
  }) as Procesado;
};
