-- Fundamentos: casos ocultos con su solucion de referencia (nunca salen al navegador),
-- marca de fallo oculto y detalle de cada envio, y las pistas del tutor de IA.

BEGIN;

ALTER TABLE fundamentos_ejercicios
  ADD COLUMN IF NOT EXISTS casos_ocultos JSONB NOT NULL DEFAULT '[]'::jsonb
    CHECK (jsonb_typeof(casos_ocultos) = 'array'),
  ADD COLUMN IF NOT EXISTS solucion_referencia TEXT;

-- El detalle es la salida o el error de un ejemplo visible; de un caso oculto queda NULL.
ALTER TABLE fundamentos_envios
  ADD COLUMN IF NOT EXISTS oculto BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS detalle TEXT CHECK (char_length(detalle) <= 2000);

CREATE TABLE IF NOT EXISTS fundamentos_pistas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ejercicio_id INTEGER NOT NULL REFERENCES fundamentos_ejercicios(id) ON DELETE CASCADE,
  envio_id UUID REFERENCES fundamentos_envios(id) ON DELETE SET NULL,
  veredicto TEXT NOT NULL,
  pista TEXT NOT NULL,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fundamentos_pistas_usuario
  ON fundamentos_pistas (user_id, creado_en);

ALTER TABLE fundamentos_pistas ENABLE ROW LEVEL SECURITY;

COMMIT;
