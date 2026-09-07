

ALTER TABLE limites_envio
  ADD COLUMN IF NOT EXISTS ultima_pista TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION registrar_pista(p_user_id UUID, p_espera_segundos INTEGER)
RETURNS TABLE (permitido BOOLEAN, espera_segundos INTEGER)
LANGUAGE plpgsql AS $$
DECLARE
  v_ultima  TIMESTAMPTZ;
  v_faltan  INTEGER;
BEGIN
  SELECT ultima_pista INTO v_ultima FROM limites_envio WHERE user_id = p_user_id FOR UPDATE;

  IF NOT FOUND THEN

    INSERT INTO limites_envio (user_id, ultimo_envio, dia, conteo_dia, ultima_pista)
    VALUES (p_user_id, now() - INTERVAL '1 hour', CURRENT_DATE, 0, now());
    RETURN QUERY SELECT true, 0;
    RETURN;
  END IF;

  IF v_ultima IS NOT NULL THEN
    v_faltan := p_espera_segundos - FLOOR(EXTRACT(EPOCH FROM (now() - v_ultima)))::INTEGER;
    IF v_faltan > 0 THEN
      RETURN QUERY SELECT false, v_faltan;
      RETURN;
    END IF;
  END IF;

  UPDATE limites_envio SET ultima_pista = now() WHERE user_id = p_user_id;
  RETURN QUERY SELECT true, 0;
END;
$$;
