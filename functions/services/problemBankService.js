const db = require('../db');

const saveProblem = async (problem, tagIds = [], client = db) => {
  const values = [
    problem.title,
    problem.slug,
    problem.descriptionMarkdown,
    problem.difficultyRating,
    problem.timeLimitSec,
    problem.memoryLimitMb,
    problem.isActive ?? true,
  ];
  const query = problem.id
    ? `UPDATE problems SET title = $1, slug = $2, description_markdown = $3,
         difficulty_rating = $4, time_limit_sec = $5, memory_limit_mb = $6, is_active = $7
       WHERE id = $8 RETURNING *`
    : `INSERT INTO problems
         (title, slug, description_markdown, difficulty_rating, time_limit_sec, memory_limit_mb, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`;
  if (problem.id) values.push(problem.id);
  const result = await client.query(query, values);
  if (!result.rowCount) throw new Error('Problema no encontrado.');
  const saved = result.rows[0];
  await client.query('DELETE FROM problem_tags WHERE problem_id = $1', [saved.id]);
  for (const tagId of [...new Set(tagIds)]) {
    await client.query(
      'INSERT INTO problem_tags (problem_id, tag_id) VALUES ($1, $2)',
      [saved.id, tagId],
    );
  }
  return saved;
};

const getHiddenTestCases = async (problemId, client = db) => {
  const result = await client.query(
    `SELECT id, input, expected_output FROM test_cases
     WHERE problem_id = $1 AND is_hidden = true ORDER BY id`,
    [problemId],
  );
  return result.rows;
};

module.exports = { saveProblem, getHiddenTestCases };