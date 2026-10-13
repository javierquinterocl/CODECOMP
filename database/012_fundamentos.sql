-- Modulo Fundamentos: ejercicios de PSeInt y avance de cada estudiante.

CREATE TABLE IF NOT EXISTS fundamentos_ejercicios (
  id SERIAL PRIMARY KEY,
  nivel TEXT NOT NULL CHECK (nivel IN ('fundamentos', 'practica', 'avanzado')),
  numero INTEGER NOT NULL CHECK (numero > 0),
  tema TEXT NOT NULL,
  dificultad SMALLINT NOT NULL CHECK (dificultad BETWEEN 1 AND 5),
  titulo TEXT NOT NULL,
  resumen TEXT NOT NULL,
  descripcion TEXT[] NOT NULL,
  entrada TEXT NOT NULL,
  salida TEXT NOT NULL,
  ejemplos JSONB NOT NULL DEFAULT '[]',
  pista_concepto TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  UNIQUE (nivel, numero)
);

-- Una fila por estudiante y ejercicio abierto; `codigo` es el borrador del editor.
CREATE TABLE IF NOT EXISTS fundamentos_progreso (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ejercicio_id INTEGER NOT NULL REFERENCES fundamentos_ejercicios(id) ON DELETE CASCADE,
  abierto_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  visto_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  codigo TEXT CHECK (char_length(codigo) <= 20000),
  PRIMARY KEY (user_id, ejercicio_id)
);

-- Solo entra la Edge Function, con el rol de la conexion directa.
ALTER TABLE fundamentos_ejercicios ENABLE ROW LEVEL SECURITY;
ALTER TABLE fundamentos_progreso ENABLE ROW LEVEL SECURITY;
