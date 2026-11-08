-- Escalones de practica (S4): escalon minimo que el docente puede fijar a un estudiante.
-- El escalon actual se calcula (nivel real o 5 resueltos); este piso solo lo sube.

ALTER TABLE users ADD COLUMN IF NOT EXISTS escalon_minimo SMALLINT NOT NULL DEFAULT 1
  CHECK (escalon_minimo BETWEEN 1 AND 5);
