-- Pegados por ejercicio (solo cantidad y tamano, nunca el contenido) para la senal
-- "resuelto con pegado" del docente. Se llena con la misma autorizacion que el tiempo.

BEGIN;

ALTER TABLE actividad_ejercicio
  ADD COLUMN IF NOT EXISTS pegados INTEGER NOT NULL DEFAULT 0 CHECK (pegados >= 0),
  ADD COLUMN IF NOT EXISTS caracteres_pegados INTEGER NOT NULL DEFAULT 0 CHECK (caracteres_pegados >= 0);

COMMIT;
