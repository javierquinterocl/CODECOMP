// Elo K=32, solo puntua el primer accepted. Logica igual a functions/services/skillEngine.js.

import type { Sql } from './db.ts';

export const K = 32;

export const VEREDICTOS = new Set([
  'ACCEPTED',
  'WRONG_ANSWER',
  'TIME_LIMIT_EXCEEDED',
  'RUNTIME_ERROR',
  'COMPILATION_ERROR',
]);

export const probabilidadEsperada = (ratingUsuario: number, dificultad: number): number =>
  1 / (1 + 10 ** ((dificultad - ratingUsuario) / 400));

export const cambioDeRating = (
  ratingUsuario: number,
  dificultad: number,
  primerAcierto: boolean,
): number =>
  primerAcierto ? Math.round(K * (1 - probabilidadEsperada(ratingUsuario, dificultad))) : 0;

export interface Procesado {
  submission_id: string;
  verdict: string;
  rating_change: number;
  first_solve: boolean;
}

export const procesarResultado = async (
  sql: Sql,
  submissionId: string,
  veredicto: string,
): Promise<Procesado> => {
  if (!VEREDICTOS.has(veredicto)) {
    throw new Error('El veredicto del juez no es valido para procesar.');
  }

  return await sql.begin(async (tx) => {
    const [envio] = await tx`
      SELECT s.*, p.difficulty_rating FROM submissions s
      JOIN problems p ON p.id = s.problem_id
      WHERE s.id = ${submissionId} FOR UPDATE
    `;
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

    const [usuario] = await tx`SELECT * FROM users WHERE id = ${envio.user_id} FOR UPDATE`;

    const [yaResuelto] = await tx`
      SELECT id FROM submissions
      WHERE user_id = ${envio.user_id} AND problem_id = ${envio.problem_id}
        AND verdict = 'ACCEPTED' AND id <> ${submissionId}
      LIMIT 1
    `;

    // El indice one_accepted_submission_per_problem no permite dos accepted.
    if (veredicto === 'ACCEPTED' && yaResuelto) {
      await tx`DELETE FROM submissions WHERE id = ${submissionId}`;
      return {
        submission_id: yaResuelto.id as string,
        verdict: 'ACCEPTED',
        rating_change: 0,
        first_solve: false,
      };
    }

    const primerAcierto = veredicto === 'ACCEPTED' && !yaResuelto;
    const delta = cambioDeRating(
      usuario.global_rating as number,
      envio.difficulty_rating as number,
      primerAcierto,
    );

    await tx`
      UPDATE submissions
      SET verdict = ${veredicto}::submission_verdict, rating_change = ${delta}, processed_at = now()
      WHERE id = ${submissionId}
    `;

    await tx`
      UPDATE users
      SET attempted_count = attempted_count + 1,
          solved_count = solved_count + ${primerAcierto ? 1 : 0},
          global_rating = global_rating + ${delta}
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

    return {
      submission_id: submissionId,
      verdict: veredicto,
      rating_change: delta,
      first_solve: primerAcierto,
    };
  }) as Procesado;
};
