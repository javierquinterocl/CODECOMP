-- Tiempo activo por ejercicio y dia (Problemas o Fundamentos). Solo con autorizacion de datos,
-- como actividad_diaria: se borra al revocar y se conserva 12 meses.

BEGIN;

CREATE TABLE IF NOT EXISTS actividad_ejercicio (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  dia DATE NOT NULL,
  problem_id UUID REFERENCES problems(id) ON DELETE CASCADE,
  ejercicio_id INTEGER REFERENCES fundamentos_ejercicios(id) ON DELETE CASCADE,
  segundos INTEGER NOT NULL DEFAULT 0 CHECK (segundos BETWEEN 0 AND 86400),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK ((problem_id IS NULL) <> (ejercicio_id IS NULL))
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_actividad_ejercicio_problema
  ON actividad_ejercicio (user_id, dia, problem_id) WHERE problem_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_actividad_ejercicio_fundamentos
  ON actividad_ejercicio (user_id, dia, ejercicio_id) WHERE ejercicio_id IS NOT NULL;

ALTER TABLE actividad_ejercicio ENABLE ROW LEVEL SECURITY;

COMMIT;
