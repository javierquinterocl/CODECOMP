-- Diagnostico de calidad del catalogo (solo lectura).
WITH casos AS (
  SELECT
    problem_id,
    count(*) AS n,
    count(*) FILTER (WHERE is_hidden) AS ocultos,
    -- Recorte del dataset: la salida se corta y se le pegan tres puntos.
    count(*) FILTER (WHERE rtrim(expected_output, E' \n\r\t') ~ '[^.]\.\.\.$') AS recortados,
    -- Termina en cuatro puntos o mas: puede ser recorte o un tablero de puntos.
    count(*) FILTER (WHERE rtrim(expected_output, E' \n\r\t') ~ '\.{4,}$') AS dudosos
  FROM test_cases
  GROUP BY problem_id
),
envios AS (
  SELECT
    problem_id,
    count(*) AS n,
    count(*) FILTER (WHERE verdict = 'ACCEPTED') AS aceptados
  FROM submissions
  GROUP BY problem_id
),
etiquetas AS (
  SELECT
    pt.problem_id,
    count(*) FILTER (WHERE t.name <> 'none') AS reales,
    bool_or(t.name = 'interactive') AS interactiva,
    bool_or(t.name = '*special') AS especial
  FROM problem_tags pt
  JOIN tags t ON t.id = pt.tag_id
  GROUP BY pt.problem_id
),
repetidos AS (
  -- Mismo titulo y mismo enunciado: se conserva el de menor problem_number.
  SELECT id, row_number() OVER (
    PARTITION BY lower(title), md5(description_markdown) ORDER BY problem_number, id
  ) AS copia
  FROM problems
  WHERE is_active
),
banderas AS (
  SELECT
    p.id,
    p.slug,
    p.difficulty_rating = 1200 AS r1200,
    COALESCE(c.n, 0) = 0 AS sin_casos,
    COALESCE(c.n, 0) BETWEEN 1 AND 2 AS pocos_casos,
    COALESCE(c.n, 0) > 0 AND COALESCE(c.ocultos, 0) = 0 AS sin_ocultos,
    COALESCE(c.recortados, 0) > 0 AS recortado,
    COALESCE(c.recortados, 0) > 0 AND c.n - c.recortados < 3 AS recortado_sin_arreglo,
    COALESCE(c.dudosos, 0) > 0 AND COALESCE(c.recortados, 0) = 0 AS recorte_dudoso,
    lower(p.description_markdown) ~ (
      '(any of them|any of these|any one of'
      || '|if there (are|exist|exists) (multiple|several|many|more than one)'
      || '|(print|output|find|choose|report|return) any'
      || '|any (valid|suitable|correct|possible|such|optimal)'
      || '|(multiple|several) (possible |correct |optimal |valid )?(answers|solutions))'
    ) AS varias_respuestas,
    lower(p.description_markdown) ~ '(absolute or relative error|relative or absolute error|absolute error|relative error)'
      AS decimales,
    lower(p.description_markdown) ~ '(interactive|flush)' OR COALESCE(e.interactiva, false)
      AS interactivo,
    length(btrim(p.description_markdown)) < 300 AS enunciado_corto,
    COALESCE(e.reales, 0) = 0 AS sin_etiquetas,
    COALESCE(e.especial, false) AS especial,
    r.copia > 1 AS repetido,
    COALESCE(s.n, 0) >= 3 AND COALESCE(s.aceptados, 0) = 0 AS envios_sin_aceptar
  FROM problems p
  LEFT JOIN casos c ON c.problem_id = p.id
  LEFT JOIN envios s ON s.problem_id = p.id
  LEFT JOIN etiquetas e ON e.problem_id = p.id
  LEFT JOIN repetidos r ON r.id = p.id
  WHERE p.is_active
),
largo AS (
  SELECT b.id, b.slug, f.orden, f.categoria, f.marca
  FROM banderas b
  CROSS JOIN LATERAL (VALUES
    (10, '2. rating = 1200', b.r1200),
    (20, '3a. sin casos', b.sin_casos),
    (21, '3b. con 1 o 2 casos', b.pocos_casos),
    (22, '3c. sin caso oculto', b.sin_ocultos),
    (30, '4a. salida recortada (...)', b.recortado),
    (31, '4b. recortada y quedan < 3 casos sanos', b.recortado_sin_arreglo),
    (32, '4c. termina en puntos, dudoso', b.recorte_dudoso),
    (40, '5. varias respuestas validas (texto)', b.varias_respuestas),
    (45, '5b. respuesta decimal con tolerancia', b.decimales),
    (50, '6. interactivo (texto o etiqueta)', b.interactivo),
    (60, '7a. enunciado < 300 caracteres', b.enunciado_corto),
    (61, '7b. sin etiquetas (o solo "none")', b.sin_etiquetas),
    (70, '8. >= 3 envios y ningun ACCEPTED', b.envios_sin_aceptar),
    (80, 'extra: etiqueta *special', b.especial),
    (81, 'extra: copia de otro problema', b.repetido),
    -- Todo lo que rompe el juez o el enunciado; no cuenta el 1200 ni las etiquetas.
    (90, 'UNION juez (3a 3b 4a 5 5b 6 7a)', b.sin_casos OR b.pocos_casos OR b.recortado
      OR b.varias_respuestas OR b.decimales OR b.interactivo OR b.enunciado_corto),
    (91, 'UNION todo lo pedido (2 3 4a 5 6 7 8)', b.r1200 OR b.sin_casos OR b.pocos_casos
      OR b.sin_ocultos OR b.recortado OR b.varias_respuestas OR b.interactivo
      OR b.enunciado_corto OR b.sin_etiquetas OR b.envios_sin_aceptar),
    (92, 'UNION todo + 5b + extras', b.r1200 OR b.sin_casos OR b.pocos_casos
      OR b.sin_ocultos OR b.recortado OR b.varias_respuestas OR b.decimales OR b.interactivo
      OR b.enunciado_corto OR b.sin_etiquetas OR b.envios_sin_aceptar OR b.especial
      OR b.repetido)
  ) AS f(orden, categoria, marca)
),
total AS (SELECT count(*) AS n FROM banderas)
SELECT
  l.categoria,
  count(*) FILTER (WHERE l.marca) AS cantidad,
  round(100.0 * count(*) FILTER (WHERE l.marca) / t.n, 1) AS pct,
  t.n - count(*) FILTER (WHERE l.marca) AS resto,
  (array_agg(l.slug ORDER BY md5(l.id::text)) FILTER (WHERE l.marca))[1:5] AS ejemplos
FROM largo l
CROSS JOIN total t
GROUP BY l.orden, l.categoria, t.n
ORDER BY l.orden;
