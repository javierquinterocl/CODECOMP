const db = require('../db');

const getRecommendedProblems = async (userId, limit = 5, pool = db) => {
  const result = await pool.query(
    `SELECT recommendations.*, problems.problem_number
     FROM get_recommended_problems($1, $2) recommendations
     JOIN problems ON problems.id = recommendations.id`,
    [userId, Math.max(0, Math.min(Number(limit) || 5, 100))],
  );
  return result.rows;
};

module.exports = { getRecommendedProblems };