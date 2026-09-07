

CREATE OR REPLACE FUNCTION get_recommended_problems(p_user_id UUID, p_limit INTEGER DEFAULT 5)
RETURNS TABLE (id UUID, title VARCHAR, slug VARCHAR, difficulty_rating INTEGER, relevance_score NUMERIC)
LANGUAGE SQL VOLATILE AS $$
  WITH user_state AS (SELECT global_rating FROM users WHERE users.id = p_user_id),
  weak_tags AS (
    SELECT t.id, COALESCE(m.mastery_score, 0) AS mastery_score
    FROM tags t JOIN problem_tags pt ON pt.tag_id = t.id
    LEFT JOIN user_tag_mastery m ON m.tag_id = t.id AND m.user_id = p_user_id
    GROUP BY t.id, m.mastery_score
    ORDER BY COALESCE(m.mastery_score, 0), t.id LIMIT 3
  ),
  candidates AS (
    SELECT p.id, p.title, p.slug, p.difficulty_rating,
      (COUNT(wt.id) * 1000 - ABS(p.difficulty_rating - us.global_rating))::NUMERIC AS relevance_score
    FROM problems p CROSS JOIN user_state us
    LEFT JOIN submissions solved ON solved.problem_id = p.id
      AND solved.user_id = p_user_id AND solved.verdict = 'ACCEPTED'
    LEFT JOIN problem_tags pt ON pt.problem_id = p.id
    LEFT JOIN weak_tags wt ON wt.id = pt.tag_id
    WHERE p.is_active AND solved.id IS NULL
      AND p.difficulty_rating BETWEEN us.global_rating - 200 AND us.global_rating + 600
    GROUP BY p.id, p.title, p.slug, p.difficulty_rating, us.global_rating
  ),
  
  mejores AS (
    SELECT c.*, ROW_NUMBER() OVER (
      PARTITION BY c.difficulty_rating ORDER BY c.relevance_score DESC, c.id
    ) AS puesto
    FROM candidates c
  ),
  elegidos AS (
    SELECT DISTINCT ON (m.difficulty_rating) m.id, m.title, m.slug,
      m.difficulty_rating, m.relevance_score
    FROM mejores m WHERE m.puesto <= 10
    ORDER BY m.difficulty_rating, random()
  )
  -- De menor a mayor: la cinta se lee como una escalera.
  SELECT elegidos.id, elegidos.title, elegidos.slug,
    elegidos.difficulty_rating, elegidos.relevance_score
  FROM elegidos
  ORDER BY elegidos.difficulty_rating
  LIMIT GREATEST(p_limit, 0);
$$;
