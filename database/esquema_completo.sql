

-- ── 001_adaptive_platform.sql ──

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
-- ── 002_firebase_catalog_compatibility.sql ──

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS firebase_uid VARCHAR(128) UNIQUE;

ALTER TABLE problems
  ADD COLUMN IF NOT EXISTS problem_number INTEGER UNIQUE;

CREATE INDEX IF NOT EXISTS idx_users_firebase_uid ON users (firebase_uid);
CREATE INDEX IF NOT EXISTS idx_problems_number ON problems (problem_number);
-- ── 003_problem_import_compatibility.sql ──

-- Idempotencia de los casos importados desde Hugging Face.
CREATE UNIQUE INDEX IF NOT EXISTS uq_test_cases_problem_input_output
  ON test_cases (problem_id, md5(input), md5(expected_output));
-- ── 004_codeforces_rating_range.sql ──

-- Codeforces publica ratings de problemas de hasta 3500.
ALTER TABLE problems
  DROP CONSTRAINT IF EXISTS problems_difficulty_rating_check;

ALTER TABLE problems
  ADD CONSTRAINT problems_difficulty_rating_check
  CHECK (difficulty_rating BETWEEN 800 AND 3500);
-- ── 005_limites_y_presupuesto.sql ──

-- Control de abuso y de costo del juez. Sin esto, cualquier usuario
-- autenticado puede vaciar la cuota de RapidAPI.

CREATE TABLE IF NOT EXISTS limites_envio (
  user_id      UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  ultimo_envio TIMESTAMPTZ NOT NULL DEFAULT now(),
  dia          DATE        NOT NULL,
  conteo_dia   INTEGER     NOT NULL DEFAULT 0 CHECK (conteo_dia >= 0)
);

CREATE TABLE IF NOT EXISTS presupuesto (
  periodo   TEXT    PRIMARY KEY,          -- '2026-09-05' o '2026-09'
  llamadas  INTEGER NOT NULL DEFAULT 0 CHECK (llamadas >= 0),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Bitacora del juez: auditar consumo y depurar sin volver a llamar a Judge0.
CREATE TABLE IF NOT EXISTS ejecuciones (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID REFERENCES users(id) ON DELETE SET NULL,
  problema_numero    INTEGER,
  lenguaje_id        INTEGER NOT NULL,
  codigo_hash        CHAR(64) NOT NULL,
  estado             TEXT NOT NULL CHECK (estado IN ('evaluado', 'error')),
  error_proxy        TEXT,
  status_id          INTEGER,
  status_descripcion TEXT,
  stdout             TEXT,
  stderr             TEXT,
  compile_output     TEXT,
  tiempo_segundos    NUMERIC(10, 6),
  memoria_kb         INTEGER,
  duracion_ms        INTEGER,
  creado_en          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ejecuciones_user_fecha ON ejecuciones (user_id, creado_en DESC);

-- Cooldown + tope diario, atomico. Devuelve el motivo para el Retry-After.
CREATE OR REPLACE FUNCTION registrar_envio(
  p_user_id          UUID,
  p_dia              DATE,
  p_espera_segundos  INTEGER,
  p_tope_diario      INTEGER
)
RETURNS TABLE (permitido BOOLEAN, codigo TEXT, espera_segundos INTEGER, conteo_dia INTEGER)
LANGUAGE plpgsql AS $$
DECLARE
  v_fila       limites_envio%ROWTYPE;
  v_transcurr  NUMERIC;
  v_conteo     INTEGER;
BEGIN
  SELECT * INTO v_fila FROM limites_envio WHERE user_id = p_user_id FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO limites_envio (user_id, ultimo_envio, dia, conteo_dia)
    VALUES (p_user_id, now(), p_dia, 1);
    RETURN QUERY SELECT true, NULL::TEXT, 0, 1;
    RETURN;
  END IF;

  v_transcurr := EXTRACT(EPOCH FROM (now() - v_fila.ultimo_envio));
  IF v_transcurr < p_espera_segundos THEN
    RETURN QUERY SELECT false, 'limite-espera'::TEXT,
      CEIL(p_espera_segundos - v_transcurr)::INTEGER, v_fila.conteo_dia;
    RETURN;
  END IF;

  v_conteo := CASE WHEN v_fila.dia = p_dia THEN v_fila.conteo_dia ELSE 0 END;
  IF v_conteo >= p_tope_diario THEN
    RETURN QUERY SELECT false, 'limite-diario'::TEXT, 0, v_conteo;
    RETURN;
  END IF;

  UPDATE limites_envio
     SET ultimo_envio = now(), dia = p_dia, conteo_dia = v_conteo + 1
   WHERE user_id = p_user_id;

  RETURN QUERY SELECT true, NULL::TEXT, 0, v_conteo + 1;
END;
$$;

-- Tope global: impide que la factura de RapidAPI se dispare. Consume cupo
-- solo si hay margen en el dia Y en el mes.
CREATE OR REPLACE FUNCTION consumir_presupuesto(
  p_dia      TEXT,
  p_mes      TEXT,
  p_max_dia  INTEGER,
  p_max_mes  INTEGER
)
RETURNS TABLE (permitido BOOLEAN, codigo TEXT, usado_dia INTEGER, usado_mes INTEGER)
LANGUAGE plpgsql AS $$
DECLARE
  v_dia INTEGER;
  v_mes INTEGER;
BEGIN
  -- Orden fijo dia->mes para que dos peticiones no se bloqueen en cruz.
  INSERT INTO presupuesto (periodo, llamadas) VALUES (p_dia, 0)
    ON CONFLICT (periodo) DO NOTHING;
  INSERT INTO presupuesto (periodo, llamadas) VALUES (p_mes, 0)
    ON CONFLICT (periodo) DO NOTHING;

  SELECT llamadas INTO v_dia FROM presupuesto WHERE periodo = p_dia FOR UPDATE;
  SELECT llamadas INTO v_mes FROM presupuesto WHERE periodo = p_mes FOR UPDATE;

  IF v_dia >= p_max_dia THEN
    RETURN QUERY SELECT false, 'presupuesto-diario'::TEXT, v_dia, v_mes;
    RETURN;
  END IF;
  IF v_mes >= p_max_mes THEN
    RETURN QUERY SELECT false, 'presupuesto-mensual'::TEXT, v_dia, v_mes;
    RETURN;
  END IF;

  UPDATE presupuesto SET llamadas = llamadas + 1 WHERE periodo IN (p_dia, p_mes);

  RETURN QUERY SELECT true, NULL::TEXT, v_dia + 1, v_mes + 1;
END;
$$;
