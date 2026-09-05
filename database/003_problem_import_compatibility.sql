-- Idempotencia de los casos importados desde Hugging Face.
CREATE UNIQUE INDEX IF NOT EXISTS uq_test_cases_problem_input_output
  ON test_cases (problem_id, md5(input), md5(expected_output));