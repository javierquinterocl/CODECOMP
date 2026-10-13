-- Traduccion del catalogo: titulo y enunciado en espanol junto al original en ingles.

ALTER TABLE problems
  ADD COLUMN IF NOT EXISTS title_es TEXT,
  ADD COLUMN IF NOT EXISTS description_markdown_es TEXT,
  ADD COLUMN IF NOT EXISTS translated_at TIMESTAMPTZ;
