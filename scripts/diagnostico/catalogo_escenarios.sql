-- Problemas sanos segun lo que se desactive (solo lectura).
WITH casos AS (
  SELECT
    problem_id,
    count(*) AS n,
    count(*) FILTER (WHERE rtrim(expected_output, E' \n\r\t') ~ '[^.]\.\.\.$') AS recortados
  FROM test_cases
  GROUP BY problem_id
),
rep AS (
  SELECT id, row_number() OVER (
    PARTITION BY lower(title), md5(description_markdown) ORDER BY problem_number, id
  ) AS copia
  FROM problems
  WHERE is_active
),
b AS (
  SELECT
    p.id,
    p.slug,
    lower(p.title) = 'none' AS sin_nombre,
    c.n <= 2 AS pocos,
    c.recortados > 0 AS recortado,
    c.recortados > 0 AND c.n - c.recortados < 3 AS rec_sin_arreglo,
    lower(p.description_markdown) ~ (
      '(any of them|any of these|any one of'
      || '|if there (are|exist|exists) (multiple|several|many|more than one)'
      || '|(print|output|find|choose|report|return) any'
      || '|any (valid|suitable|correct|possible|such|optimal)'
      || '|(multiple|several) (possible |correct |optimal |valid )?(answers|solutions))'
    ) AS multi,
    lower(p.description_markdown) ~ '((print|output|printing|outputting) any|any of them)'
      AS multi_estricto,
    lower(p.description_markdown) ~ '(absolute or relative error|relative or absolute error|absolute error|relative error)'
      AS dec,
    lower(p.description_markdown) ~ '(interactive|flush)' OR EXISTS (
      SELECT 1 FROM problem_tags pt JOIN tags t ON t.id = pt.tag_id
      WHERE pt.problem_id = p.id AND t.name = 'interactive'
    ) AS inter,
    length(btrim(p.description_markdown)) < 300 AS corto,
    r.copia > 1 AS copia,
    p.difficulty_rating = 1200 AS r1200
  FROM problems p
  LEFT JOIN casos c ON c.problem_id = p.id
  LEFT JOIN rep r ON r.id = p.id
  WHERE p.is_active
)
SELECT
  count(*) AS activos,
  count(*) FILTER (WHERE sin_nombre) AS sin_nombre,
  count(*) FILTER (WHERE sin_nombre AND r1200) AS sin_nombre_y_1200,
  count(*) FILTER (WHERE multi_estricto) AS multi_estricto,
  count(*) FILTER (WHERE multi AND copia) AS multi_y_copia,
  count(*) FILTER (
    WHERE recortado AND NOT rec_sin_arreglo
      AND NOT (multi OR dec OR inter OR pocos OR corto OR copia OR sin_nombre)
  ) AS recortados_reparables_y_por_lo_demas_sanos,
  -- Solo lo que rompe el juez, quitando los casos recortados en vez del problema.
  count(*) FILTER (WHERE NOT (pocos OR rec_sin_arreglo OR multi OR dec OR inter OR corto))
    AS sanos_plan_juez,
  count(*) FILTER (WHERE NOT (pocos OR rec_sin_arreglo OR multi OR dec OR inter OR corto OR copia))
    AS sanos_sin_copias,
  count(*) FILTER (
    WHERE NOT (pocos OR rec_sin_arreglo OR multi OR dec OR inter OR corto OR copia OR sin_nombre)
  ) AS sanos_sin_copias_ni_sin_nombre,
  -- Igual que el anterior pero desactivando tambien todo problema con algun caso recortado.
  count(*) FILTER (
    WHERE NOT (pocos OR recortado OR multi OR dec OR inter OR corto OR copia OR sin_nombre)
  ) AS sanos_sin_reparar_nada,
  count(*) FILTER (
    WHERE NOT (pocos OR rec_sin_arreglo OR multi_estricto OR dec OR inter OR corto OR copia
      OR sin_nombre)
  ) AS sanos_con_multi_estricto,
  count(*) FILTER (
    WHERE NOT (pocos OR rec_sin_arreglo OR multi OR dec OR inter OR corto OR copia OR sin_nombre)
      AND r1200
  ) AS de_esos_con_1200
FROM b;
