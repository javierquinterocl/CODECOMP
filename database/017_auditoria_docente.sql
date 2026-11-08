-- Auditoria de la vista docente (Ley 1581): que docente consulto que estudiante y cuando.
-- Solo se inserta: actualizar o borrar filas falla.

BEGIN;

CREATE TABLE IF NOT EXISTS auditoria_docente (
  id BIGSERIAL PRIMARY KEY,
  docente_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  estudiante_id UUID REFERENCES users(id) ON DELETE SET NULL,
  clase_id UUID REFERENCES clases(id) ON DELETE SET NULL,
  accion TEXT NOT NULL CHECK (accion IN ('ver_clase', 'ver_estudiante', 'cambiar_escalon')),
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
