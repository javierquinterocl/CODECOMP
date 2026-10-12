-- Saneamiento del catalogo: desactiva problemas, borra casos recortados y corrige tres ratings.

BEGIN;

-- Motivos de desactivacion de cada problema.
ALTER TABLE problems
  ADD COLUMN IF NOT EXISTS deactivation_reasons TEXT[] NOT NULL DEFAULT '{}';

-- Copia de los casos que se borran mas abajo.
CREATE TABLE IF NOT EXISTS test_cases_recortados (
  id UUID PRIMARY KEY,
  problem_id UUID NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
  input TEXT NOT NULL,
  expected_output TEXT NOT NULL,
  is_hidden BOOLEAN NOT NULL,
  borrado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE test_cases_recortados ENABLE ROW LEVEL SECURITY;

-- Las banderas se calculan sobre los activos y antes de cambiar nada.
DROP TABLE IF EXISTS saneo_catalogo;

CREATE TEMP TABLE saneo_catalogo ON COMMIT DROP AS
WITH casos AS (
  SELECT
    problem_id,
    count(*) AS n,
    -- Recorte del dataset: la salida se corta y se le pegan tres puntos.
    count(*) FILTER (WHERE rtrim(expected_output, E' \n\r\t') ~ '[^.]\.\.\.$') AS recortados
  FROM test_cases
  GROUP BY problem_id
),
repetidos AS (
  -- Mismo titulo y mismo enunciado: se conserva el de menor problem_number.
  SELECT id, row_number() OVER (
    PARTITION BY lower(title), md5(description_markdown) ORDER BY problem_number, id
  ) AS copia
  FROM problems
  WHERE is_active
)
SELECT
  p.id,
  COALESCE(c.recortados, 0) > 0 AND c.n - c.recortados >= 3 AS reparar,
  array_remove(ARRAY[
    CASE WHEN (
      lower(p.description_markdown) ~ '(interactive|flush)' OR EXISTS (
        SELECT 1 FROM problem_tags pt JOIN tags t ON t.id = pt.tag_id
        WHERE pt.problem_id = p.id AND t.name = 'interactive'
      )
    ) AND p.slug NOT IN (
      -- Falsos positivos revisados en la fase 1.
      'quest-114975', 'quest-57455', 'string-set-queries-18813', 'polandball-and-forest-3227'
    ) THEN 'interactivo' END,
    CASE WHEN COALESCE(c.n, 0) BETWEEN 1 AND 2 THEN 'pocos_casos' END,
    CASE WHEN COALESCE(c.recortados, 0) > 0 AND c.n - c.recortados < 3
      THEN 'recorte_sin_arreglo' END,
    CASE WHEN length(btrim(p.description_markdown)) < 300 THEN 'enunciado_corto' END,
    CASE WHEN lower(p.description_markdown) ~ (
      '(any of them|any of these|any one of'
      || '|if there (are|exist|exists) (multiple|several|many|more than one)'
      || '|(print|output|find|choose|report|return) any'
      || '|any (valid|suitable|correct|possible|such|optimal)'
      || '|(multiple|several) (possible |correct |optimal |valid )?(answers|solutions))'
    ) THEN 'varias_respuestas' END,
    CASE WHEN lower(p.description_markdown)
      ~ '(absolute or relative error|relative or absolute error|absolute error|relative error)'
      THEN 'decimales' END,
    CASE WHEN r.copia > 1 THEN 'copia' END,
    CASE WHEN lower(p.title) = 'none' THEN 'sin_nombre' END
  ], NULL) AS motivos
FROM problems p
LEFT JOIN casos c ON c.problem_id = p.id
LEFT JOIN repetidos r ON r.id = p.id
WHERE p.is_active;

-- Ratings recuperables por nombre en codeforces-problems.json.
UPDATE problems AS p
SET difficulty_rating = v.rating
FROM (VALUES
  ('tower-of-hanoi-19235', 2400),
  ('genetic-engineering-6945', 2500),
  ('mister-b-and-boring-game-10452', 2200)
) AS v(slug, rating)
WHERE p.slug = v.slug AND p.difficulty_rating = 1200;

-- Casos recortados de los problemas a los que les quedan al menos 3 casos sanos.
INSERT INTO test_cases_recortados (id, problem_id, input, expected_output, is_hidden)
SELECT tc.id, tc.problem_id, tc.input, tc.expected_output, tc.is_hidden
FROM test_cases tc
JOIN saneo_catalogo s ON s.id = tc.problem_id
WHERE s.reparar AND rtrim(tc.expected_output, E' \n\r\t') ~ '[^.]\.\.\.$'
ON CONFLICT (id) DO NOTHING;

DELETE FROM test_cases tc
USING saneo_catalogo s
WHERE s.id = tc.problem_id
  AND s.reparar
  AND rtrim(tc.expected_output, E' \n\r\t') ~ '[^.]\.\.\.$';

UPDATE problems AS p
SET is_active = false, deactivation_reasons = s.motivos
FROM saneo_catalogo s
WHERE s.id = p.id AND s.motivos <> '{}';

COMMIT;
