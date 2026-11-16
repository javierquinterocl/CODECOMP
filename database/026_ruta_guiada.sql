-- Modo guiado por clase: el docente obliga a recorrer la Ruta en orden (dominar un tema abre el
-- siguiente) para su clase, y queda auditado.

BEGIN;

ALTER TABLE clases ADD COLUMN IF NOT EXISTS ruta_guiada BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE auditoria_docente DROP CONSTRAINT IF EXISTS auditoria_docente_accion_check;
ALTER TABLE auditoria_docente ADD CONSTRAINT auditoria_docente_accion_check CHECK (accion IN (
  'ver_clase', 'ver_estudiante', 'cambiar_escalon',
  'competencia_crear', 'competencia_editar', 'competencia_equipos',
  'competencia_problemas', 'competencia_dirigir', 'avisar_clase', 'ejecutar_borrado', 'ruta_guiada'
));

COMMIT;
