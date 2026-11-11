-- Competencias organizadas desde CODECOMP sobre DOMjudge: concursos, equipos, integrantes y
-- problemas. DOMjudge juzga; aqui vive quien compite donde y de donde salio cada problema.

BEGIN;

CREATE TABLE IF NOT EXISTS competencias (
  cid TEXT PRIMARY KEY,
  nombre TEXT NOT NULL CHECK (char_length(nombre) BETWEEN 3 AND 120),
  archivada BOOLEAN NOT NULL DEFAULT false,
  creada_por UUID REFERENCES users(id) ON DELETE SET NULL,
  creada_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Un equipo pertenece a un solo concurso; retirado = fuera del marcador y sin envios.
CREATE TABLE IF NOT EXISTS competencia_equipos (
  team_id TEXT PRIMARY KEY,
  cid TEXT NOT NULL REFERENCES competencias(cid) ON DELETE CASCADE,
  nombre TEXT NOT NULL CHECK (char_length(nombre) BETWEEN 2 AND 80),
  retirado BOOLEAN NOT NULL DEFAULT false,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (team_id, cid)
);

-- Un estudiante, un equipo por concurso.
CREATE TABLE IF NOT EXISTS competencia_miembros (
  team_id TEXT NOT NULL,
  cid TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  unido_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (team_id, user_id),
  UNIQUE (cid, user_id),
  FOREIGN KEY (team_id, cid) REFERENCES competencia_equipos(team_id, cid) ON DELETE CASCADE
);

-- Problemas del concurso; problem_id indica que salio del banco (y quedo reservado).
CREATE TABLE IF NOT EXISTS competencia_problemas (
  cid TEXT NOT NULL REFERENCES competencias(cid) ON DELETE CASCADE,
  dj_problem_id TEXT NOT NULL,
  problem_id UUID REFERENCES problems(id) ON DELETE SET NULL,
  letra TEXT NOT NULL CHECK (letra ~ '^[A-Z]$'),
  liberado BOOLEAN NOT NULL DEFAULT false,
  agregado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (cid, dj_problem_id),
  UNIQUE (cid, letra)
);
CREATE INDEX IF NOT EXISTS idx_competencia_problemas_banco
  ON competencia_problemas (problem_id) WHERE problem_id IS NOT NULL;

ALTER TABLE competencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE competencia_equipos ENABLE ROW LEVEL SECURITY;
ALTER TABLE competencia_miembros ENABLE ROW LEVEL SECURITY;
ALTER TABLE competencia_problemas ENABLE ROW LEVEL SECURITY;

-- Auditoria: acciones del jurado y un detalle corto (concurso, equipo o problema).
ALTER TABLE auditoria_docente ADD COLUMN IF NOT EXISTS detalle TEXT
  CHECK (detalle IS NULL OR char_length(detalle) <= 300);
ALTER TABLE auditoria_docente DROP CONSTRAINT IF EXISTS auditoria_docente_accion_check;
ALTER TABLE auditoria_docente ADD CONSTRAINT auditoria_docente_accion_check CHECK (accion IN (
  'ver_clase', 'ver_estudiante', 'cambiar_escalon',
  'competencia_crear', 'competencia_editar', 'competencia_equipos',
  'competencia_problemas', 'competencia_dirigir'
));

CREATE OR REPLACE FUNCTION auditoria_solo_insercion() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  -- Las claves foraneas pueden poner NULL al borrar un usuario o una clase.
  IF TG_OP = 'UPDATE' AND NEW.id = OLD.id AND NEW.docente_id = OLD.docente_id
     AND NEW.accion = OLD.accion AND NEW.creado_en = OLD.creado_en
     AND NEW.detalle IS NOT DISTINCT FROM OLD.detalle
     AND (NEW.estudiante_id IS NULL OR NEW.estudiante_id = OLD.estudiante_id)
     AND (NEW.clase_id IS NULL OR NEW.clase_id = OLD.clase_id) THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'La auditoria docente solo admite inserciones.';
END;
$$;

COMMIT;
