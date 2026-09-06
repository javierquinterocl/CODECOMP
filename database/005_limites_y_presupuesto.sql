-- Control de abuso y de costo del juez. Sin esto, cualquier usuario
-- autenticado puede vaciar la cuota de RapidAPI.

CREATE TABLE IF NOT EXISTS limites_envio (
  user_id      UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  ultimo_envio TIMESTAMPTZ NOT NULL DEFAULT now(),
  dia          DATE        NOT NULL,
  conteo_dia   INTEGER     NOT NULL DEFAULT 0 CHECK (conteo_dia >= 0)
);

CREATE TABLE IF NOT EXISTS presupuesto (
  periodo   TEXT    PRIMARY KEY,          -- '2026-09-05' o '2026-09'
  llamadas  INTEGER NOT NULL DEFAULT 0 CHECK (llamadas >= 0),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Bitacora del juez: auditar consumo y depurar sin volver a llamar a Judge0.
CREATE TABLE IF NOT EXISTS ejecuciones (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID REFERENCES users(id) ON DELETE SET NULL,
  problema_numero    INTEGER,
  lenguaje_id        INTEGER NOT NULL,
  codigo_hash        CHAR(64) NOT NULL,
  estado             TEXT NOT NULL CHECK (estado IN ('evaluado', 'error')),
  error_proxy        TEXT,
  status_id          INTEGER,
  status_descripcion TEXT,
  stdout             TEXT,
  stderr             TEXT,
  compile_output     TEXT,
  tiempo_segundos    NUMERIC(10, 6),
  memoria_kb         INTEGER,
  duracion_ms        INTEGER,
  creado_en          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ejecuciones_user_fecha ON ejecuciones (user_id, creado_en DESC);

-- Cooldown + tope diario, atomico. Devuelve el motivo para el Retry-After.
CREATE OR REPLACE FUNCTION registrar_envio(
  p_user_id          UUID,
  p_dia              DATE,
  p_espera_segundos  INTEGER,
  p_tope_diario      INTEGER
)
RETURNS TABLE (permitido BOOLEAN, codigo TEXT, espera_segundos INTEGER, conteo_dia INTEGER)
LANGUAGE plpgsql AS $$
DECLARE
  v_fila       limites_envio%ROWTYPE;
  v_transcurr  NUMERIC;
  v_conteo     INTEGER;
BEGIN
  SELECT * INTO v_fila FROM limites_envio WHERE user_id = p_user_id FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO limites_envio (user_id, ultimo_envio, dia, conteo_dia)
    VALUES (p_user_id, now(), p_dia, 1);
    RETURN QUERY SELECT true, NULL::TEXT, 0, 1;
    RETURN;
  END IF;

  v_transcurr := EXTRACT(EPOCH FROM (now() - v_fila.ultimo_envio));
  IF v_transcurr < p_espera_segundos THEN
    RETURN QUERY SELECT false, 'limite-espera'::TEXT,
      CEIL(p_espera_segundos - v_transcurr)::INTEGER, v_fila.conteo_dia;
    RETURN;
  END IF;

  v_conteo := CASE WHEN v_fila.dia = p_dia THEN v_fila.conteo_dia ELSE 0 END;
  IF v_conteo >= p_tope_diario THEN
    RETURN QUERY SELECT false, 'limite-diario'::TEXT, 0, v_conteo;
    RETURN;
  END IF;

  UPDATE limites_envio
     SET ultimo_envio = now(), dia = p_dia, conteo_dia = v_conteo + 1
   WHERE user_id = p_user_id;

  RETURN QUERY SELECT true, NULL::TEXT, 0, v_conteo + 1;
END;
$$;

-- Tope global: impide que la factura de RapidAPI se dispare. Consume cupo
-- solo si hay margen en el dia Y en el mes.
CREATE OR REPLACE FUNCTION consumir_presupuesto(
  p_dia      TEXT,
  p_mes      TEXT,
  p_max_dia  INTEGER,
  p_max_mes  INTEGER
)
RETURNS TABLE (permitido BOOLEAN, codigo TEXT, usado_dia INTEGER, usado_mes INTEGER)
LANGUAGE plpgsql AS $$
DECLARE
  v_dia INTEGER;
  v_mes INTEGER;
BEGIN
  -- Orden fijo dia->mes para que dos peticiones no se bloqueen en cruz.
  INSERT INTO presupuesto (periodo, llamadas) VALUES (p_dia, 0)
    ON CONFLICT (periodo) DO NOTHING;
  INSERT INTO presupuesto (periodo, llamadas) VALUES (p_mes, 0)
    ON CONFLICT (periodo) DO NOTHING;

  SELECT llamadas INTO v_dia FROM presupuesto WHERE periodo = p_dia FOR UPDATE;
  SELECT llamadas INTO v_mes FROM presupuesto WHERE periodo = p_mes FOR UPDATE;

  IF v_dia >= p_max_dia THEN
    RETURN QUERY SELECT false, 'presupuesto-diario'::TEXT, v_dia, v_mes;
    RETURN;
  END IF;
  IF v_mes >= p_max_mes THEN
    RETURN QUERY SELECT false, 'presupuesto-mensual'::TEXT, v_dia, v_mes;
    RETURN;
  END IF;

  UPDATE presupuesto SET llamadas = llamadas + 1 WHERE periodo IN (p_dia, p_mes);

  RETURN QUERY SELECT true, NULL::TEXT, v_dia + 1, v_mes + 1;
END;
$$;
