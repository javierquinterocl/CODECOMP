-- Codeforces publica ratings de problemas de hasta 3500.
ALTER TABLE problems
  DROP CONSTRAINT IF EXISTS problems_difficulty_rating_check;

ALTER TABLE problems
  ADD CONSTRAINT problems_difficulty_rating_check
  CHECK (difficulty_rating BETWEEN 800 AND 3500);