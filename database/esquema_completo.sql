

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
-- ── 007_recomendaciones_una_por_dificultad.sql ──

-- Una recomendación por cada dificultad, y distinta en cada consulta.
--
-- La 006 repartía en escalones de 200 puntos, así que repetía rating dentro
-- del mismo escalón. Aquí cada ficha trae un difficulty_rating distinto.
--
-- Deja de ser STABLE: entre las 10 más relevantes de cada dificultad elige
-- una al azar, para que el botón de refrescar traiga otra ronda.

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
  -- Las 10 mejores de cada dificultad: el sorteo elige entre esas, no entre
  -- todo el banco, para que refrescar cambie la ficha sin perder relevancia.
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

-- Cambia el tipo de retorno, así que toca soltar la función antes.

DROP FUNCTION IF EXISTS get_recommended_problems(UUID, INTEGER);

CREATE FUNCTION get_recommended_problems(p_user_id UUID, p_limit INTEGER DEFAULT 5)
RETURNS TABLE (id UUID, title VARCHAR, slug VARCHAR, difficulty_rating INTEGER,
               tags TEXT[], relevance_score NUMERIC)
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
      COALESCE(ARRAY_AGG(DISTINCT et.name) FILTER (WHERE et.name IS NOT NULL), '{}')::TEXT[] AS tags,
      (COUNT(wt.id) * 1000 - ABS(p.difficulty_rating - us.global_rating))::NUMERIC AS relevance_score
    FROM problems p CROSS JOIN user_state us
    LEFT JOIN submissions solved ON solved.problem_id = p.id
      AND solved.user_id = p_user_id AND solved.verdict = 'ACCEPTED'
    LEFT JOIN problem_tags pt ON pt.problem_id = p.id
    LEFT JOIN tags et ON et.id = pt.tag_id
    LEFT JOIN weak_tags wt ON wt.id = pt.tag_id
    WHERE p.is_active AND solved.id IS NULL
      AND p.difficulty_rating BETWEEN us.global_rating - 200 AND us.global_rating + 600
    GROUP BY p.id, p.title, p.slug, p.difficulty_rating, us.global_rating
  ),
  -- Las 10 mejores de cada dificultad: el sorteo elige entre esas, no entre
  -- todo el banco, para que refrescar cambie la ficha sin perder relevancia.
  mejores AS (
    SELECT c.*, ROW_NUMBER() OVER (
      PARTITION BY c.difficulty_rating ORDER BY c.relevance_score DESC, c.id
    ) AS puesto
    FROM candidates c
  ),
  elegidos AS (
    SELECT DISTINCT ON (m.difficulty_rating) m.id, m.title, m.slug,
      m.difficulty_rating, m.tags, m.relevance_score
    FROM mejores m WHERE m.puesto <= 10
    ORDER BY m.difficulty_rating, random()
  )
  -- De menor a mayor: la cinta se lee como una escalera.
  SELECT elegidos.id, elegidos.title, elegidos.slug, elegidos.difficulty_rating,
    elegidos.tags, elegidos.relevance_score
  FROM elegidos
  ORDER BY elegidos.difficulty_rating
  LIMIT GREATEST(p_limit, 0);
$$;


ALTER TABLE limites_envio
  ADD COLUMN IF NOT EXISTS ultima_pista TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION registrar_pista(p_user_id UUID, p_espera_segundos INTEGER)
RETURNS TABLE (permitido BOOLEAN, espera_segundos INTEGER)
LANGUAGE plpgsql AS $$
DECLARE
  v_ultima  TIMESTAMPTZ;
  v_faltan  INTEGER;
BEGIN
  SELECT ultima_pista INTO v_ultima FROM limites_envio WHERE user_id = p_user_id FOR UPDATE;

  IF NOT FOUND THEN

    INSERT INTO limites_envio (user_id, ultimo_envio, dia, conteo_dia, ultima_pista)
    VALUES (p_user_id, now() - INTERVAL '1 hour', CURRENT_DATE, 0, now());
    RETURN QUERY SELECT true, 0;
    RETURN;
  END IF;

  IF v_ultima IS NOT NULL THEN
    v_faltan := p_espera_segundos - FLOOR(EXTRACT(EPOCH FROM (now() - v_ultima)))::INTEGER;
    IF v_faltan > 0 THEN
      RETURN QUERY SELECT false, v_faltan;
      RETURN;
    END IF;
  END IF;

  UPDATE limites_envio SET ultima_pista = now() WHERE user_id = p_user_id;
  RETURN QUERY SELECT true, 0;
END;
$$;
-- ── 010_saneamiento_catalogo.sql ──

-- Saneamiento del catalogo: desactiva problemas, borra casos recortados y corrige tres ratings.

BEGIN;

-- Motivos de desactivacion de cada problema.
ALTER TABLE problems
  ADD COLUMN IF NOT EXISTS deactivation_reasons TEXT[] NOT NULL DEFAULT '{}';

-- Copia de los casos que se borran mas abajo.
CREATE TABLE IF NOT EXISTS test_cases_recortados (
  id UUID PRIMARY KEY,
  problem_id UUID NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
  input TEXT NOT NULL,
  expected_output TEXT NOT NULL,
  is_hidden BOOLEAN NOT NULL,
  borrado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE test_cases_recortados ENABLE ROW LEVEL SECURITY;

-- Las banderas se calculan sobre los activos y antes de cambiar nada.
DROP TABLE IF EXISTS saneo_catalogo;

CREATE TEMP TABLE saneo_catalogo ON COMMIT DROP AS
WITH casos AS (
  SELECT
    problem_id,
    count(*) AS n,
    -- Recorte del dataset: la salida se corta y se le pegan tres puntos.
    count(*) FILTER (WHERE rtrim(expected_output, E' \n\r\t') ~ '[^.]\.\.\.$') AS recortados
  FROM test_cases
  GROUP BY problem_id
),
repetidos AS (
  -- Mismo titulo y mismo enunciado: se conserva el de menor problem_number.
  SELECT id, row_number() OVER (
    PARTITION BY lower(title), md5(description_markdown) ORDER BY problem_number, id
  ) AS copia
  FROM problems
  WHERE is_active
)
SELECT
  p.id,
  COALESCE(c.recortados, 0) > 0 AND c.n - c.recortados >= 3 AS reparar,
  array_remove(ARRAY[
    CASE WHEN (
      lower(p.description_markdown) ~ '(interactive|flush)' OR EXISTS (
        SELECT 1 FROM problem_tags pt JOIN tags t ON t.id = pt.tag_id
        WHERE pt.problem_id = p.id AND t.name = 'interactive'
      )
    ) AND p.slug NOT IN (
      -- Falsos positivos revisados en la fase 1.
      'quest-114975', 'quest-57455', 'string-set-queries-18813', 'polandball-and-forest-3227'
    ) THEN 'interactivo' END,
    CASE WHEN COALESCE(c.n, 0) BETWEEN 1 AND 2 THEN 'pocos_casos' END,
    CASE WHEN COALESCE(c.recortados, 0) > 0 AND c.n - c.recortados < 3
      THEN 'recorte_sin_arreglo' END,
    CASE WHEN length(btrim(p.description_markdown)) < 300 THEN 'enunciado_corto' END,
    CASE WHEN lower(p.description_markdown) ~ (
      '(any of them|any of these|any one of'
      || '|if there (are|exist|exists) (multiple|several|many|more than one)'
      || '|(print|output|find|choose|report|return) any'
      || '|any (valid|suitable|correct|possible|such|optimal)'
      || '|(multiple|several) (possible |correct |optimal |valid )?(answers|solutions))'
    ) THEN 'varias_respuestas' END,
    CASE WHEN lower(p.description_markdown)
      ~ '(absolute or relative error|relative or absolute error|absolute error|relative error)'
      THEN 'decimales' END,
    CASE WHEN r.copia > 1 THEN 'copia' END,
    CASE WHEN lower(p.title) = 'none' THEN 'sin_nombre' END
  ], NULL) AS motivos
FROM problems p
LEFT JOIN casos c ON c.problem_id = p.id
LEFT JOIN repetidos r ON r.id = p.id
WHERE p.is_active;

-- Ratings recuperables por nombre en codeforces-problems.json.
UPDATE problems AS p
SET difficulty_rating = v.rating
FROM (VALUES
  ('tower-of-hanoi-19235', 2400),
  ('genetic-engineering-6945', 2500),
  ('mister-b-and-boring-game-10452', 2200)
) AS v(slug, rating)
WHERE p.slug = v.slug AND p.difficulty_rating = 1200;

-- Casos recortados de los problemas a los que les quedan al menos 3 casos sanos.
INSERT INTO test_cases_recortados (id, problem_id, input, expected_output, is_hidden)
SELECT tc.id, tc.problem_id, tc.input, tc.expected_output, tc.is_hidden
FROM test_cases tc
JOIN saneo_catalogo s ON s.id = tc.problem_id
WHERE s.reparar AND rtrim(tc.expected_output, E' \n\r\t') ~ '[^.]\.\.\.$'
ON CONFLICT (id) DO NOTHING;

DELETE FROM test_cases tc
USING saneo_catalogo s
WHERE s.id = tc.problem_id
  AND s.reparar
  AND rtrim(tc.expected_output, E' \n\r\t') ~ '[^.]\.\.\.$';

UPDATE problems AS p
SET is_active = false, deactivation_reasons = s.motivos
FROM saneo_catalogo s
WHERE s.id = p.id AND s.motivos <> '{}';

COMMIT;

-- ── 011_traduccion_catalogo.sql ──
-- Traduccion del catalogo: titulo y enunciado en espanol junto al original en ingles.

ALTER TABLE problems
  ADD COLUMN IF NOT EXISTS title_es TEXT,
  ADD COLUMN IF NOT EXISTS description_markdown_es TEXT,
  ADD COLUMN IF NOT EXISTS translated_at TIMESTAMPTZ;

-- ── 012_fundamentos.sql ──
-- Modulo Fundamentos: ejercicios de PSeInt y avance de cada estudiante.

CREATE TABLE IF NOT EXISTS fundamentos_ejercicios (
  id SERIAL PRIMARY KEY,
  nivel TEXT NOT NULL CHECK (nivel IN ('fundamentos', 'practica', 'avanzado')),
  numero INTEGER NOT NULL CHECK (numero > 0),
  tema TEXT NOT NULL,
  dificultad SMALLINT NOT NULL CHECK (dificultad BETWEEN 1 AND 5),
  titulo TEXT NOT NULL,
  resumen TEXT NOT NULL,
  descripcion TEXT[] NOT NULL,
  entrada TEXT NOT NULL,
  salida TEXT NOT NULL,
  ejemplos JSONB NOT NULL DEFAULT '[]',
  pista_concepto TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  UNIQUE (nivel, numero)
);

-- Una fila por estudiante y ejercicio abierto; `codigo` es el borrador del editor.
CREATE TABLE IF NOT EXISTS fundamentos_progreso (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ejercicio_id INTEGER NOT NULL REFERENCES fundamentos_ejercicios(id) ON DELETE CASCADE,
  abierto_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  visto_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  codigo TEXT CHECK (char_length(codigo) <= 20000),
  PRIMARY KEY (user_id, ejercicio_id)
);

-- Solo entra la Edge Function, con el rol de la conexion directa.
ALTER TABLE fundamentos_ejercicios ENABLE ROW LEVEL SECURITY;
ALTER TABLE fundamentos_progreso ENABLE ROW LEVEL SECURITY;

-- ── 013_limite_pseint.sql ──
-- Espera y tope diario del juez de PSeInt, aparte de los de Problemas.

ALTER TABLE limites_envio
  ADD COLUMN IF NOT EXISTS ultimo_pseint TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS dia_pseint DATE,
  ADD COLUMN IF NOT EXISTS conteo_pseint INTEGER NOT NULL DEFAULT 0 CHECK (conteo_pseint >= 0);

CREATE OR REPLACE FUNCTION registrar_envio_pseint(
  p_user_id          UUID,
  p_dia              DATE,
  p_espera_segundos  INTEGER,
  p_tope_diario      INTEGER
)
RETURNS TABLE (permitido BOOLEAN, codigo TEXT, espera_segundos INTEGER, conteo_dia INTEGER)
LANGUAGE plpgsql AS $$
DECLARE
  v_fila    limites_envio%ROWTYPE;
  v_faltan  INTEGER;
  v_conteo  INTEGER;
BEGIN
  -- Dos primeros envios a la vez no chocan: la fila nace una sola vez y sin espera para Problemas.
  INSERT INTO limites_envio (user_id, ultimo_envio, dia, conteo_dia)
  VALUES (p_user_id, now() - INTERVAL '1 hour', p_dia, 0)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT * INTO v_fila FROM limites_envio WHERE user_id = p_user_id FOR UPDATE;

  IF v_fila.ultimo_pseint IS NOT NULL THEN
    v_faltan := CEIL(p_espera_segundos - EXTRACT(EPOCH FROM (now() - v_fila.ultimo_pseint)))::INTEGER;
    IF v_faltan > 0 THEN
      RETURN QUERY SELECT false, 'limite-espera'::TEXT, v_faltan, v_fila.conteo_pseint;
      RETURN;
    END IF;
  END IF;

  v_conteo := CASE WHEN v_fila.dia_pseint = p_dia THEN v_fila.conteo_pseint ELSE 0 END;
  IF v_conteo >= p_tope_diario THEN
    RETURN QUERY SELECT false, 'limite-diario'::TEXT, 0, v_conteo;
    RETURN;
  END IF;

  UPDATE limites_envio
     SET ultimo_pseint = now(), dia_pseint = p_dia, conteo_pseint = v_conteo + 1
   WHERE user_id = p_user_id;

  RETURN QUERY SELECT true, NULL::TEXT, 0, v_conteo + 1;
END;
$$;
-- ── 015_registro_estudiante.sql ──
-- Registro del estudiante: todos los intentos, pistas, aperturas, actividad diaria,
-- envios de Fundamentos, clases y autorizacion de datos (Ley 1581).

-- Envios cortados por el juez (plazo, presupuesto, error): se guardan pero no cuentan.
ALTER TYPE submission_verdict ADD VALUE IF NOT EXISTS 'ERROR_JUEZ';

BEGIN;

-- Se guardan tambien los aceptados repetidos; el primero se decide con el bloqueo del usuario.
DROP INDEX IF EXISTS one_accepted_submission_per_problem;
CREATE INDEX IF NOT EXISTS idx_submissions_usuario_problema
  ON submissions (user_id, problem_id, created_at);

-- Numero (desde 1) del caso donde fallo el envio; NULL si fue aceptado o no se evaluo.
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS caso_fallido INTEGER
  CHECK (caso_fallido IS NULL OR caso_fallido > 0);

-- NULL: aun no responde. La fecha guarda la ultima respuesta.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS datos_autorizados BOOLEAN,
  ADD COLUMN IF NOT EXISTS datos_respondido_en TIMESTAMPTZ;

-- Cada pista del tutor, con el problema y el veredicto que la motivo.
CREATE TABLE IF NOT EXISTS pistas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  problem_id UUID NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
  veredicto TEXT NOT NULL,
  pista TEXT NOT NULL,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pistas_usuario_problema ON pistas (user_id, problem_id, creado_en);

-- Primera y ultima vez que el estudiante abrio cada problema (hora de la base).
CREATE TABLE IF NOT EXISTS aperturas_problema (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  problem_id UUID NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
  primera TIMESTAMPTZ NOT NULL DEFAULT now(),
  ultima TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, problem_id)
);

-- Actividad acumulada por estudiante y dia: tiempo con la pestana visible y pegados.
CREATE TABLE IF NOT EXISTS actividad_diaria (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  dia DATE NOT NULL,
  segundos_activos INTEGER NOT NULL DEFAULT 0 CHECK (segundos_activos BETWEEN 0 AND 86400),
  pegados INTEGER NOT NULL DEFAULT 0 CHECK (pegados >= 0),
  caracteres_pegados INTEGER NOT NULL DEFAULT 0 CHECK (caracteres_pegados >= 0),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, dia)
);

-- Envios de Fundamentos (antes no se guardaban).
CREATE TABLE IF NOT EXISTS fundamentos_envios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ejercicio_id INTEGER NOT NULL REFERENCES fundamentos_ejercicios(id) ON DELETE CASCADE,
  codigo TEXT NOT NULL CHECK (char_length(codigo) <= 20000),
  veredicto TEXT NOT NULL,
  ejemplo_fallido INTEGER,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fundamentos_envios_usuario
  ON fundamentos_envios (user_id, ejercicio_id, creado_en);

-- Clases: el docente las crea y el estudiante entra con el codigo.
CREATE TABLE IF NOT EXISTS clases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL CHECK (char_length(nombre) BETWEEN 3 AND 80),
  codigo TEXT NOT NULL UNIQUE CHECK (codigo ~ '^[A-Z0-9]{6}$'),
  docente_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS clase_miembros (
  clase_id UUID NOT NULL REFERENCES clases(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  unido_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (clase_id, user_id)
);

-- Solo entra la Edge Function, con el rol de la conexion directa.
ALTER TABLE pistas ENABLE ROW LEVEL SECURITY;
ALTER TABLE aperturas_problema ENABLE ROW LEVEL SECURITY;
ALTER TABLE actividad_diaria ENABLE ROW LEVEL SECURITY;
ALTER TABLE fundamentos_envios ENABLE ROW LEVEL SECURITY;
ALTER TABLE clases ENABLE ROW LEVEL SECURITY;
ALTER TABLE clase_miembros ENABLE ROW LEVEL SECURITY;

COMMIT;
-- ── 016_nivel_real.sql ──
-- Nivel real (Elo educativo, supabase/functions/_compartido/nivel.ts): nivel con decimales y
-- un resultado por estudiante y problema. global_rating queda como su redondeo.

BEGIN;

-- Copia del rating calculado con la formula anterior.
CREATE TABLE IF NOT EXISTS users_rating_previo_016 AS
  SELECT id AS user_id, global_rating, now() AS copiado_en FROM users;

ALTER TABLE users ADD COLUMN IF NOT EXISTS nivel NUMERIC(10, 3) NOT NULL DEFAULT 1000;

-- Un resultado por problema: aceptado (puntaje segun fallos y pista) o cerrado sin resolver.
CREATE TABLE IF NOT EXISTS resultados_problema (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  problem_id UUID NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
  submission_id UUID REFERENCES submissions(id) ON DELETE SET NULL,
  aceptado BOOLEAN NOT NULL,
  puntaje NUMERIC(5, 4) NOT NULL CHECK (puntaje BETWEEN 0 AND 1),
  esperado NUMERIC(5, 4) NOT NULL CHECK (esperado BETWEEN 0 AND 1),
  cambio NUMERIC(10, 3) NOT NULL,
  nivel_despues NUMERIC(10, 3) NOT NULL,
  cerrado_en TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (user_id, problem_id)
);
CREATE INDEX IF NOT EXISTS idx_resultados_usuario_fecha ON resultados_problema (user_id, cerrado_en);

ALTER TABLE users_rating_previo_016 ENABLE ROW LEVEL SECURITY;
ALTER TABLE resultados_problema ENABLE ROW LEVEL SECURITY;

COMMIT;
-- ── 017_auditoria_docente.sql ──
-- Auditoria de la vista docente (Ley 1581): que docente consulto que estudiante y cuando.
-- Solo se inserta: actualizar o borrar filas falla.

BEGIN;

CREATE TABLE IF NOT EXISTS auditoria_docente (
  id BIGSERIAL PRIMARY KEY,
  docente_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  estudiante_id UUID REFERENCES users(id) ON DELETE SET NULL,
  clase_id UUID REFERENCES clases(id) ON DELETE SET NULL,
  accion TEXT NOT NULL CHECK (accion IN ('ver_clase', 'ver_estudiante')),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_auditoria_docente_fecha ON auditoria_docente (docente_id, creado_en);

CREATE OR REPLACE FUNCTION auditoria_solo_insercion() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  -- Las claves foraneas pueden poner NULL al borrar un usuario o una clase.
  IF TG_OP = 'UPDATE' AND NEW.id = OLD.id AND NEW.docente_id = OLD.docente_id
     AND NEW.accion = OLD.accion AND NEW.creado_en = OLD.creado_en
     AND (NEW.estudiante_id IS NULL OR NEW.estudiante_id = OLD.estudiante_id)
     AND (NEW.clase_id IS NULL OR NEW.clase_id = OLD.clase_id) THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'La auditoria docente solo admite inserciones.';
END;
$$;

DROP TRIGGER IF EXISTS auditoria_docente_inmutable ON auditoria_docente;
CREATE TRIGGER auditoria_docente_inmutable
  BEFORE UPDATE OR DELETE ON auditoria_docente
  FOR EACH ROW EXECUTE FUNCTION auditoria_solo_insercion();

ALTER TABLE auditoria_docente ENABLE ROW LEVEL SECURITY;

COMMIT;
