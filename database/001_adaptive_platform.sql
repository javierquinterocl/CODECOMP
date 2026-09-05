CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE submission_verdict AS ENUM (
  'PENDING', 'ACCEPTED', 'WRONG_ANSWER', 'TIME_LIMIT_EXCEEDED',
  'RUNTIME_ERROR', 'COMPILATION_ERROR'
);

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(320) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  global_rating INTEGER NOT NULL DEFAULT 1000 CHECK (global_rating >= 0),
  solved_count INTEGER NOT NULL DEFAULT 0 CHECK (solved_count >= 0),
  attempted_count INTEGER NOT NULL DEFAULT 0 CHECK (attempted_count >= 0)
);

CREATE TABLE problems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(200) NOT NULL,
  slug VARCHAR(220) NOT NULL UNIQUE,
  description_markdown TEXT NOT NULL,
  difficulty_rating INTEGER NOT NULL CHECK (difficulty_rating BETWEEN 800 AND 2400),
  time_limit_sec NUMERIC(6, 3) NOT NULL DEFAULT 1.000 CHECK (time_limit_sec > 0),
  memory_limit_mb INTEGER NOT NULL DEFAULT 256 CHECK (memory_limit_mb > 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(80) NOT NULL UNIQUE,
  description TEXT
);

CREATE TABLE problem_tags (
  problem_id UUID NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (problem_id, tag_id)
);

CREATE TABLE test_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_id UUID NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
  input TEXT NOT NULL DEFAULT '',
  expected_output TEXT NOT NULL,
  is_hidden BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE user_tag_mastery (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  mastery_score NUMERIC(5, 2) NOT NULL DEFAULT 0.00 CHECK (mastery_score BETWEEN 0 AND 100),
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  successes INTEGER NOT NULL DEFAULT 0 CHECK (successes BETWEEN 0 AND attempts),
  PRIMARY KEY (user_id, tag_id)
);

CREATE TABLE submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  problem_id UUID NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
  source_code TEXT NOT NULL,
  language_id INTEGER NOT NULL CHECK (language_id > 0),
  judge0_token VARCHAR(255),
  verdict submission_verdict NOT NULL DEFAULT 'PENDING',
  execution_time_sec NUMERIC(10, 6),
  memory_used_kb INTEGER CHECK (memory_used_kb IS NULL OR memory_used_kb >= 0),
  rating_change INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX idx_problems_active_difficulty ON problems (difficulty_rating) WHERE is_active;
CREATE INDEX idx_problem_tags_tag_problem ON problem_tags (tag_id, problem_id);
CREATE INDEX idx_test_cases_problem_hidden ON test_cases (problem_id, is_hidden);
CREATE INDEX idx_submissions_user_created ON submissions (user_id, created_at DESC);
CREATE INDEX idx_submissions_problem_user ON submissions (problem_id, user_id);
CREATE UNIQUE INDEX one_accepted_submission_per_problem
  ON submissions (user_id, problem_id) WHERE verdict = 'ACCEPTED';

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
      ABS(p.difficulty_rating - us.global_rating)::NUMERIC AS rating_distance
    FROM problems p CROSS JOIN user_state us
    LEFT JOIN submissions solved ON solved.problem_id = p.id
      AND solved.user_id = p_user_id AND solved.verdict = 'ACCEPTED'
    LEFT JOIN problem_tags pt ON pt.problem_id = p.id
    LEFT JOIN weak_tags wt ON wt.id = pt.tag_id
    WHERE p.is_active AND solved.id IS NULL
      AND p.difficulty_rating BETWEEN us.global_rating - 100 AND us.global_rating + 150
    GROUP BY p.id, p.title, p.slug, p.difficulty_rating, us.global_rating
  )
  SELECT id, title, slug, difficulty_rating,
    (weak_tag_matches * 1000 - rating_distance)::NUMERIC AS relevance_score
  FROM candidates ORDER BY relevance_score DESC, rating_distance ASC, id
  LIMIT GREATEST(p_limit, 0);
$$;