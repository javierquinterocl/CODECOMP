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
