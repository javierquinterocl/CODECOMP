ALTER TABLE users
  ADD COLUMN IF NOT EXISTS firebase_uid VARCHAR(128) UNIQUE;

ALTER TABLE problems
  ADD COLUMN IF NOT EXISTS problem_number INTEGER UNIQUE;

CREATE INDEX IF NOT EXISTS idx_users_firebase_uid ON users (firebase_uid);
CREATE INDEX IF NOT EXISTS idx_problems_number ON problems (problem_number);