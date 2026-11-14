-- Notificaciones guardadas en la cuenta (campana y correo), preferencia de correo, hora de
-- inicio de las competencias y la accion de auditoria para los avisos del docente.

BEGIN;

CREATE TABLE IF NOT EXISTS notificaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (char_length(tipo) <= 40),
  -- Identifica el evento: la misma clave nunca crea dos avisos para el mismo usuario.
  clave TEXT NOT NULL CHECK (char_length(clave) <= 160),
  datos JSONB NOT NULL DEFAULT '{}'::jsonb,
  creada_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizada_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  leida_en TIMESTAMPTZ,
  correo TEXT CHECK (correo IN ('pendiente', 'enviando', 'enviado', 'fallido', 'omitido')),
  correo_intentos SMALLINT NOT NULL DEFAULT 0,
  correo_reclamado_en TIMESTAMPTZ,
  correo_enviado_en TIMESTAMPTZ,
  UNIQUE (user_id, clave)
);
CREATE INDEX IF NOT EXISTS idx_notificaciones_usuario ON notificaciones (user_id, creada_en DESC);
CREATE INDEX IF NOT EXISTS idx_notificaciones_correo ON notificaciones (creada_en)
  WHERE correo IN ('pendiente', 'enviando');
ALTER TABLE notificaciones ENABLE ROW LEVEL SECURITY;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS avisos_correo BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS correo_verificado BOOLEAN NOT NULL DEFAULT false;

-- La hora de inicio vivia solo en DOMjudge, que suele estar apagado.
ALTER TABLE competencias ADD COLUMN IF NOT EXISTS inicio TIMESTAMPTZ;

ALTER TABLE auditoria_docente DROP CONSTRAINT IF EXISTS auditoria_docente_accion_check;
ALTER TABLE auditoria_docente ADD CONSTRAINT auditoria_docente_accion_check CHECK (accion IN (
  'ver_clase', 'ver_estudiante', 'cambiar_escalon',
  'competencia_crear', 'competencia_editar', 'competencia_equipos',
  'competencia_problemas', 'competencia_dirigir', 'avisar_clase'
));

COMMIT;
