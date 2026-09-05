const db = require('../db');

const K = 32;
const ACCEPTED = 'ACCEPTED';
const VALID_VERDICTS = new Set([
  'PENDING', 'ACCEPTED', 'WRONG_ANSWER', 'TIME_LIMIT_EXCEEDED',
  'RUNTIME_ERROR', 'COMPILATION_ERROR',
]);

const processSubmissionResult = async (submissionId, verdict, pool = db) => {
  if (!VALID_VERDICTS.has(verdict) || verdict === 'PENDING') {
    throw new Error('El veredicto del juez no es válido para procesar.');
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const submissionResult = await client.query(
      `SELECT s.*, p.difficulty_rating FROM submissions s
       JOIN problems p ON p.id = s.problem_id
       WHERE s.id = $1 FOR UPDATE`,
      [submissionId],
    );
    if (!submissionResult.rowCount) throw new Error('Envío no encontrado.');
    const submission = submissionResult.rows[0];
    if (submission.processed_at) {
      await client.query('COMMIT');
      return submission;
    }

    const userResult = await client.query(
      'SELECT * FROM users WHERE id = $1 FOR UPDATE', [submission.user_id],
    );
    const user = userResult.rows[0];
    const solvedResult = await client.query(
      `SELECT id FROM submissions WHERE user_id = $1 AND problem_id = $2
       AND verdict = 'ACCEPTED' LIMIT 1`,
      [submission.user_id, submission.problem_id],
    );
    const previouslySolved = solvedResult.rowCount > 0;
    if (verdict === ACCEPTED && previouslySolved) {
      await client.query('DELETE FROM submissions WHERE id = $1', [submissionId]);
      await client.query('COMMIT');
      return {
        ...submission,
        submission_id: solvedResult.rows[0].id,
        verdict: ACCEPTED,
        rating_change: 0,
        first_solve: false,
      };
    }
    const isFirstSolve = verdict === ACCEPTED && !previouslySolved;
    const expected = 1 / (1 + (10 ** ((submission.difficulty_rating - user.global_rating) / 400)));
    const ratingChange = isFirstSolve ? Math.round(K * (1 - expected)) : 0;

    await client.query(
      `UPDATE submissions SET verdict = $1, rating_change = $2, processed_at = now()
       WHERE id = $3`, [verdict, ratingChange, submissionId],
    );
    await client.query(
      `UPDATE users SET attempted_count = attempted_count + 1,
         solved_count = solved_count + $1, global_rating = global_rating + $2
       WHERE id = $3`, [isFirstSolve ? 1 : 0, ratingChange, submission.user_id],
    );
    await client.query(
      `INSERT INTO user_tag_mastery (user_id, tag_id, attempts, successes, mastery_score)
       SELECT $1, pt.tag_id, 1, $2, CASE WHEN $2 = 1 THEN 100.00 ELSE 0.00 END
       FROM problem_tags pt WHERE pt.problem_id = $3
       ON CONFLICT (user_id, tag_id) DO UPDATE SET
         attempts = user_tag_mastery.attempts + 1,
         successes = user_tag_mastery.successes + EXCLUDED.successes,
         mastery_score = ROUND((user_tag_mastery.successes + EXCLUDED.successes)::NUMERIC
           / (user_tag_mastery.attempts + 1) * 100, 2)`,
      [submission.user_id, verdict === ACCEPTED ? 1 : 0, submission.problem_id],
    );
    await client.query('COMMIT');
    return { ...submission, verdict, rating_change: ratingChange, first_solve: isFirstSolve };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

module.exports = { processSubmissionResult };