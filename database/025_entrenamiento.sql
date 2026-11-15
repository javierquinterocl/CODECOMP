-- Entrenamiento: nivel de cada pista del tutor (1 orienta, 2 tecnica, 3 esquema) y la idea
-- clave de cada problema, generada una sola vez y compartida por todos.

BEGIN;

ALTER TABLE pistas ADD COLUMN IF NOT EXISTS nivel SMALLINT NOT NULL DEFAULT 1
  CHECK (nivel BETWEEN 1 AND 3);

CREATE TABLE IF NOT EXISTS ideas_clave (
  problem_id UUID PRIMARY KEY REFERENCES problems(id) ON DELETE CASCADE,
  idea TEXT NOT NULL CHECK (length(idea) < 2000),
  creada_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE ideas_clave ENABLE ROW LEVEL SECURITY;

COMMIT;
