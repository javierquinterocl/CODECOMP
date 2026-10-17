-- Espera y tope diario del juez de PSeInt, aparte de los de Problemas.

ALTER TABLE limites_envio
  ADD COLUMN IF NOT EXISTS ultimo_pseint TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS dia_pseint DATE,
  ADD COLUMN IF NOT EXISTS conteo_pseint INTEGER NOT NULL DEFAULT 0 CHECK (conteo_pseint >= 0);

CREATE OR REPLACE FUNCTION registrar_envio_pseint(
  p_user_id          UUID,
  p_dia              DATE,
  p_espera_segundos  INTEGER,
  p_tope_diario      INTEGER
)
RETURNS TABLE (permitido BOOLEAN, codigo TEXT, espera_segundos INTEGER, conteo_dia INTEGER)
LANGUAGE plpgsql AS $$
DECLARE
  v_fila    limites_envio%ROWTYPE;
  v_faltan  INTEGER;
  v_conteo  INTEGER;
BEGIN
  SELECT * INTO v_fila FROM limites_envio WHERE user_id = p_user_id FOR UPDATE;

  IF NOT FOUND THEN
    -- La fila nace sin espera pendiente para el juez de Problemas.
    INSERT INTO limites_envio (user_id, ultimo_envio, dia, conteo_dia, ultimo_pseint, dia_pseint, conteo_pseint)
    VALUES (p_user_id, now() - INTERVAL '1 hour', p_dia, 0, now(), p_dia, 1);
    RETURN QUERY SELECT true, NULL::TEXT, 0, 1;
    RETURN;
  END IF;

  IF v_fila.ultimo_pseint IS NOT NULL THEN
    v_faltan := CEIL(p_espera_segundos - EXTRACT(EPOCH FROM (now() - v_fila.ultimo_pseint)))::INTEGER;
    IF v_faltan > 0 THEN
      RETURN QUERY SELECT false, 'limite-espera'::TEXT, v_faltan, v_fila.conteo_pseint;
      RETURN;
    END IF;
  END IF;

  v_conteo := CASE WHEN v_fila.dia_pseint = p_dia THEN v_fila.conteo_pseint ELSE 0 END;
  IF v_conteo >= p_tope_diario THEN
    RETURN QUERY SELECT false, 'limite-diario'::TEXT, 0, v_conteo;
    RETURN;
  END IF;

  UPDATE limites_envio
     SET ultimo_pseint = now(), dia_pseint = p_dia, conteo_pseint = v_conteo + 1
   WHERE user_id = p_user_id;

  RETURN QUERY SELECT true, NULL::TEXT, 0, v_conteo + 1;
END;
$$;
