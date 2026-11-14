-- Mi cuenta: foto de perfil, cierre de sesion en todos los dispositivos y solicitudes de borrado
-- de datos (Ley 1581), con la accion de auditoria para ejecutarlas.

BEGIN;

-- Foto en tabla aparte: no carga la fila de users y se borra sola con el usuario.
CREATE TABLE IF NOT EXISTS foto_usuario (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  datos BYTEA NOT NULL CHECK (octet_length(datos) <= 61440),
  actualizada_en TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE foto_usuario ENABLE ROW LEVEL SECURITY;

-- Los tokens emitidos antes de esta hora dejan de valer en la API.
ALTER TABLE users ADD COLUMN IF NOT EXISTS sesiones_desde TIMESTAMPTZ;

-- La copia de uid y correo sobrevive al borrado: es la constancia e impide recrear la cuenta.
CREATE TABLE IF NOT EXISTS solicitudes_borrado (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  firebase_uid TEXT NOT NULL,
  email TEXT,
  estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'cancelada', 'ejecutada')),
  creada_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  resuelta_en TIMESTAMPTZ,
  resuelta_por UUID REFERENCES users(id) ON DELETE SET NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_solicitudes_borrado_pendiente
  ON solicitudes_borrado (user_id) WHERE estado = 'pendiente';
CREATE INDEX IF NOT EXISTS idx_solicitudes_borrado_uid ON solicitudes_borrado (firebase_uid);
ALTER TABLE solicitudes_borrado ENABLE ROW LEVEL SECURITY;

ALTER TABLE auditoria_docente DROP CONSTRAINT IF EXISTS auditoria_docente_accion_check;
ALTER TABLE auditoria_docente ADD CONSTRAINT auditoria_docente_accion_check CHECK (accion IN (
  'ver_clase', 'ver_estudiante', 'cambiar_escalon',
  'competencia_crear', 'competencia_editar', 'competencia_equipos',
  'competencia_problemas', 'competencia_dirigir', 'avisar_clase', 'ejecutar_borrado'
));

COMMIT;
