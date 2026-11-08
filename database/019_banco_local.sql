-- Banco local de problemas (ICPC Latinoamerica, RPC, UFPS): origen de cada problema y de sus casos.

ALTER TABLE problems
  ADD COLUMN IF NOT EXISTS fuente TEXT,
  ADD COLUMN IF NOT EXISTS fuente_url TEXT,
  ADD COLUMN IF NOT EXISTS rating_origen TEXT
    CHECK (rating_origen IS NULL OR rating_origen IN ('marcador', 'estimado')),
  ADD COLUMN IF NOT EXISTS casos_generados BOOLEAN NOT NULL DEFAULT false;

-- Un problema sin fuente es del catalogo anterior de Codeforces.
CREATE INDEX IF NOT EXISTS idx_problems_fuente ON problems (fuente) WHERE fuente IS NOT NULL;
