-- Consultas de apoyo del diagnostico (solo lectura).

-- 1. Esquema real de las tablas del catalogo.
SELECT table_name, string_agg(column_name || ' ' || data_type, ' | ' ORDER BY ordinal_position)
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('problems', 'test_cases', 'tags', 'problem_tags', 'submissions')
GROUP BY table_name;

-- 2. Totales.
SELECT
  (SELECT count(*) FROM problems) AS problemas_total,
  (SELECT count(*) FROM problems WHERE is_active) AS problemas_activos,
  (SELECT count(*) FROM test_cases) AS casos_total,
  (SELECT count(*) FROM test_cases WHERE is_hidden) AS casos_ocultos,
  (SELECT count(*) FROM submissions) AS envios;

-- 3. Distribucion de difficulty_rating por tramos.
SELECT
  CASE
    WHEN difficulty_rating < 1200 THEN '1 800-1199'
    WHEN difficulty_rating = 1200 THEN '2 =1200'
    WHEN difficulty_rating < 1600 THEN '3 1300-1599'
    WHEN difficulty_rating < 2000 THEN '4 1600-1999'
    WHEN difficulty_rating < 2400 THEN '5 2000-2399'
    WHEN difficulty_rating < 3000 THEN '6 2400-2999'
    ELSE '7 >=3000'
  END AS tramo,
  count(*) AS n,
  round(100.0 * count(*) / sum(count(*)) OVER (), 1) AS pct
FROM problems
WHERE is_active
GROUP BY 1
ORDER BY 1;

-- 4. Recortes en los casos.
SELECT
  max(length(input)) AS max_in,
  max(length(expected_output)) AS max_out,
  count(*) FILTER (WHERE rtrim(input, E' \n\r\t') LIKE '%...') AS in_fin_puntos,
  count(*) FILTER (WHERE rtrim(expected_output, E' \n\r\t') ~ '[^.]\.\.\.$') AS out_recortadas,
  count(*) FILTER (WHERE rtrim(expected_output, E' \n\r\t') ~ '\.{4,}$') AS out_dudosas
FROM test_cases;

-- 5. Muestra de "varias respuestas validas" con el contexto de la frase.
WITH m AS (
  SELECT
    p.id,
    p.slug,
    lower(p.description_markdown) AS d,
    '(any of them|any of these|any one of|if there (are|exist|exists) (multiple|several|many|more than one)|(print|output|find|choose|report|return) any|any (valid|suitable|correct|possible|such|optimal)|(multiple|several) (possible |correct |optimal |valid )?(answers|solutions))'
      AS re
  FROM problems p
  WHERE p.is_active
)
SELECT
  slug,
  regexp_replace(substr(d, greatest(regexp_instr(d, re) - 110, 1), 300), E'\\s+', ' ', 'g')
    AS contexto
FROM m
WHERE d ~ re
ORDER BY md5(id::text || 'fase1')
LIMIT 10;

-- 6. Todos los interactivos (son 20) con el contexto de la palabra.
SELECT
  p.slug,
  EXISTS (
    SELECT 1 FROM problem_tags pt JOIN tags t ON t.id = pt.tag_id
    WHERE pt.problem_id = p.id AND t.name = 'interactive'
  ) AS etiqueta,
  regexp_replace(
    substr(
      lower(p.description_markdown),
      greatest(regexp_instr(lower(p.description_markdown), '(interactive|flush)') - 70, 1),
      170
    ),
    E'\\s+', ' ', 'g'
  ) AS contexto
FROM problems p
WHERE p.is_active
  AND (
    lower(p.description_markdown) ~ '(interactive|flush)'
    OR EXISTS (
      SELECT 1 FROM problem_tags pt JOIN tags t ON t.id = pt.tag_id
      WHERE pt.problem_id = p.id AND t.name = 'interactive'
    )
  )
ORDER BY p.slug;

-- 7. Copias: mismo titulo y mismo enunciado.
WITH a AS (
  SELECT
    p.id,
    lower(p.title) AS t,
    md5(p.description_markdown) AS h,
    p.difficulty_rating,
    (
      SELECT md5(string_agg(md5(tc.input) || md5(tc.expected_output), ''
        ORDER BY md5(tc.input), md5(tc.expected_output)))
      FROM test_cases tc WHERE tc.problem_id = p.id
    ) AS hc
  FROM problems p
  WHERE p.is_active
),
g AS (
  SELECT t, h, count(*) AS n, count(DISTINCT hc) AS casos_distintos,
    count(DISTINCT difficulty_rating) AS ratings_distintos
  FROM a
  GROUP BY t, h
  HAVING count(*) > 1
)
SELECT
  count(*) AS grupos,
  sum(n - 1) AS copias_sobrantes,
  max(n) AS grupo_mayor,
  count(*) FILTER (WHERE casos_distintos = 1) AS grupos_mismos_casos,
  count(*) FILTER (WHERE ratings_distintos > 1) AS grupos_rating_distinto
FROM g;

-- 8. Envios por veredicto (senal de uso).
SELECT verdict::text, count(*) AS n, count(DISTINCT problem_id) AS problemas
FROM submissions
GROUP BY 1;
