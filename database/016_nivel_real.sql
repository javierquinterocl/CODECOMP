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
