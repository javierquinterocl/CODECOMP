

CREATE OR REPLACE FUNCTION get_recommended_problems(p_user_id UUID, p_limit INTEGER DEFAULT 5)
RETURNS TABLE (id UUID, title VARCHAR, slug VARCHAR, difficulty_rating INTEGER, relevance_score NUMERIC)
LANGUAGE SQL STABLE AS $$
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
      COUNT(wt.id)::NUMERIC AS weak_tag_matches,
      ABS(p.difficulty_rating - us.global_rating)::NUMERIC AS rating_distance,
      -- Escalón de 200 puntos contado desde el piso de la banda (0 a 4).
      ((p.difficulty_rating - (us.global_rating - 200)) / 200)::INTEGER AS escalon
    FROM problems p CROSS JOIN user_state us
    LEFT JOIN submissions solved ON solved.problem_id = p.id
      AND solved.user_id = p_user_id AND solved.verdict = 'ACCEPTED'
    LEFT JOIN problem_tags pt ON pt.problem_id = p.id
    LEFT JOIN weak_tags wt ON wt.id = pt.tag_id
    WHERE p.is_active AND solved.id IS NULL
      AND p.difficulty_rating BETWEEN us.global_rating - 200 AND us.global_rating + 600
    GROUP BY p.id, p.title, p.slug, p.difficulty_rating, us.global_rating
  ),
  ranked AS (
    SELECT c.id, c.title, c.slug, c.difficulty_rating, c.escalon,
      (c.weak_tag_matches * 1000 - c.rating_distance)::NUMERIC AS relevance_score,
      ROW_NUMBER() OVER (
        PARTITION BY c.escalon
        ORDER BY (c.weak_tag_matches * 1000 - c.rating_distance) DESC, c.id
      ) AS turno
    FROM candidates c
  )

  SELECT ranked.id, ranked.title, ranked.slug, ranked.difficulty_rating, ranked.relevance_score
  FROM ranked
  ORDER BY ranked.turno, ranked.escalon, ranked.relevance_score DESC, ranked.id
  LIMIT GREATEST(p_limit, 0);
$$;
