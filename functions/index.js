const { onRequest } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const db = require('./db');
const { processSubmissionResult } = require('./services/skillEngine');
const { getRecommendedProblems } = require('./services/recommendationService');

initializeApp();

const rapidApiKey = defineSecret('RAPIDAPI_KEY');
const databaseUrl = defineSecret('DATABASE_URL');
const JUDGE0_URL = 'https://judge0-ce.p.rapidapi.com/submissions?base64_encoded=false&wait=true';
const RAPIDAPI_HOST = 'judge0-ce.p.rapidapi.com';
const SUPPORTED_LANGUAGE_IDS = new Set([51, 54, 62, 63, 68, 71]);
const VERDICTS = new Set(['ACCEPTED', 'WRONG_ANSWER', 'TIME_LIMIT_EXCEEDED', 'RUNTIME_ERROR', 'COMPILATION_ERROR']);

const requireUser = async (req) => {
  const header = req.get('authorization') || '';
  if (!header.startsWith('Bearer ')) throw new Error('Falta el token de autenticación.');
  return getAuth().verifyIdToken(header.slice(7));
};

const getUserId = async (client, decodedToken) => {
  const result = await client.query(
    `INSERT INTO users (firebase_uid, username, email)
     VALUES ($1, $2, $3)
     ON CONFLICT (firebase_uid) DO UPDATE SET email = EXCLUDED.email
     RETURNING id`,
    [decodedToken.uid, `${(decodedToken.name || 'student').replace(/[^a-zA-Z0-9]/g, '').slice(0, 42)}-${decodedToken.uid.slice(-7)}`, decodedToken.email || `${decodedToken.uid}@firebase.local`],
  );
  return result.rows[0].id;
};

const sendToJudge0 = async (submission, apiKey) => {
  const response = await fetch(JUDGE0_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-RapidAPI-Key': apiKey,
      'X-RapidAPI-Host': RAPIDAPI_HOST,
    },
    body: JSON.stringify(submission),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Judge0 rechazó el envío.');
  return data;
};

exports.judge0Submission = onRequest({ secrets: [rapidApiKey] }, async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ message: 'Método no permitido.' });
    return;
  }

  const { source_code: sourceCode, language_id: languageId, stdin, expected_output: expectedOutput } = req.body || {};
  if (typeof sourceCode !== 'string' || !sourceCode.trim()) {
    res.status(400).json({ message: 'source_code es obligatorio.' });
    return;
  }
  if (!Number.isInteger(languageId) || !SUPPORTED_LANGUAGE_IDS.has(languageId)) {
    res.status(400).json({ message: 'language_id no está soportado.' });
    return;
  }

  const submission = {
    source_code: sourceCode,
    language_id: languageId,
    stdin: typeof stdin === 'string' ? stdin : '',
  };
  if (typeof expectedOutput === 'string' && expectedOutput) {
    submission.expected_output = expectedOutput;
  }

  try {
    const judgeResponse = await fetch(JUDGE0_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-RapidAPI-Key': rapidApiKey.value(),
        'X-RapidAPI-Host': RAPIDAPI_HOST,
      },
      body: JSON.stringify(submission),
    });
    const responseText = await judgeResponse.text();
    let data;
    try {
      data = responseText ? JSON.parse(responseText) : {};
    } catch {
      data = { message: responseText };
    }
    res.status(judgeResponse.status).json(data);
  } catch (error) {
    console.error('Judge0 proxy error:', error);
    res.status(502).json({ message: 'No se pudo conectar con Judge0.' });
  }
});

exports.syncUser = onRequest({ secrets: [databaseUrl] }, async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Método no permitido.' });
  try {
    const token = await requireUser(req);
    const userId = await getUserId(db, token);
    res.json({ userId });
  } catch (error) {
    console.error('User sync error:', error);
    res.status(401).json({ message: error.message || 'No autorizado.' });
  }
});

exports.adaptiveSubmission = onRequest({
  secrets: [rapidApiKey, databaseUrl],
  timeoutSeconds: 540,
}, async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Método no permitido.' });
  const client = await db.connect();
  try {
    const token = await requireUser(req);
    const { problem_number: problemNumber, source_code: sourceCode, language_id: languageId } = req.body || {};
    if (!Number.isInteger(problemNumber) || typeof sourceCode !== 'string' || !sourceCode.trim() || !SUPPORTED_LANGUAGE_IDS.has(languageId)) {
      return res.status(400).json({ message: 'problem_number, source_code y language_id son obligatorios.' });
    }
    await client.query('BEGIN');
    const userId = await getUserId(client, token);
    const problemResult = await client.query(
      'SELECT id FROM problems WHERE problem_number = $1 AND is_active', [problemNumber],
    );
    if (!problemResult.rowCount) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Problema no importado en PostgreSQL.' });
    }
    const problemId = problemResult.rows[0].id;
    const cases = await client.query(
      `SELECT input, expected_output FROM test_cases WHERE problem_id = $1 ORDER BY id`, [problemId],
    );
    if (!cases.rowCount) {
      await client.query('ROLLBACK');
      return res.status(409).json({ message: 'El problema no tiene casos de prueba.' });
    }
    const submissionResult = await client.query(
      `INSERT INTO submissions (user_id, problem_id, source_code, language_id)
       VALUES ($1, $2, $3, $4) RETURNING id`, [userId, problemId, sourceCode, languageId],
    );
    const submissionId = submissionResult.rows[0].id;
    await client.query('COMMIT');
    let finalResult = null;
    for (const testCase of cases.rows) {
      const judgeResult = await sendToJudge0({ source_code: sourceCode, language_id: languageId, stdin: testCase.input, expected_output: testCase.expected_output }, rapidApiKey.value());
      const statusId = judgeResult.status?.id;
      const verdict = statusId === 3 ? 'ACCEPTED' : statusId === 4 ? 'WRONG_ANSWER' : statusId === 5 ? 'TIME_LIMIT_EXCEEDED' : statusId === 6 ? 'COMPILATION_ERROR' : statusId >= 7 ? 'RUNTIME_ERROR' : 'RUNTIME_ERROR';
      finalResult = { ...judgeResult, verdict };
      if (verdict !== 'ACCEPTED') break;
    }
    if (!VERDICTS.has(finalResult.verdict)) throw new Error('Veredicto inválido.');
    const processed = await processSubmissionResult(submissionId, finalResult.verdict);
    res.json({ submissionId: processed.submission_id || submissionId, ...finalResult, ratingChange: processed.rating_change });
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch { /* transaction may already be committed */ }
    console.error('Adaptive submission error:', error);
    res.status(error.message.includes('token') ? 401 : 500).json({ message: error.message || 'No se pudo procesar el envío.' });
  } finally {
    client.release();
  }
});

exports.recommendations = onRequest({ secrets: [databaseUrl] }, async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ message: 'Método no permitido.' });
  try {
    const token = await requireUser(req);
    const userId = await getUserId(db, token);
    const problems = await getRecommendedProblems(userId, req.query.limit);
    res.json({ problems });
  } catch (error) {
    console.error('Recommendations error:', error);
    res.status(401).json({ message: error.message || 'No autorizado.' });
  }
});

exports.problems = onRequest({ secrets: [databaseUrl] }, async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ message: 'Método no permitido.' });
  const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 500);
  const offset = Math.max(Number(req.query.offset) || 0, 0);
  const tag = typeof req.query.tag === 'string' ? req.query.tag.trim() : '';
  try {
    const result = await db.query(
      `SELECT p.id, p.problem_number, p.title, p.slug,
         p.difficulty_rating, p.time_limit_sec, p.memory_limit_mb,
         COALESCE(json_agg(json_build_object('id', t.id, 'name', t.name)
           ORDER BY t.name) FILTER (WHERE t.id IS NOT NULL), '[]') AS tags
       FROM problems p
       LEFT JOIN problem_tags pt ON pt.problem_id = p.id
       LEFT JOIN tags t ON t.id = pt.tag_id
       WHERE p.is_active AND ($1 = '' OR EXISTS (
         SELECT 1 FROM problem_tags filter_pt
         JOIN tags filter_t ON filter_t.id = filter_pt.tag_id
         WHERE filter_pt.problem_id = p.id
           AND regexp_replace(lower(filter_t.name), '[^a-z0-9]+', '-', 'g') = lower($1)
       ))
       GROUP BY p.id
       ORDER BY p.problem_number NULLS LAST, p.id
       LIMIT $2 OFFSET $3`,
      [tag, limit, offset],
    );
    res.json({ problems: result.rows, limit, offset });
  } catch (error) {
    console.error('Problems list error:', error);
    res.status(500).json({ message: 'No se pudieron consultar los problemas.' });
  }
});

exports.problemDetail = onRequest({ secrets: [databaseUrl] }, async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ message: 'Método no permitido.' });
  try {
    const problemNumber = Number(req.query.number || req.params.number || req.path.split('/').filter(Boolean).pop());
    const result = await db.query(
      `SELECT p.id, p.problem_number, p.title, p.slug, p.description_markdown,
         p.difficulty_rating, p.time_limit_sec, p.memory_limit_mb,
         COALESCE((SELECT json_agg(json_build_object('input', tc.input, 'output', tc.expected_output)
           ORDER BY tc.id) FROM test_cases tc
           WHERE tc.problem_id = p.id AND NOT tc.is_hidden), '[]') AS examples,
         COALESCE((SELECT json_agg(json_build_object('id', t.id, 'name', t.name)
           ORDER BY t.name) FROM problem_tags pt JOIN tags t ON t.id = pt.tag_id
           WHERE pt.problem_id = p.id), '[]') AS tags
       FROM problems p
       WHERE p.is_active AND p.problem_number = $1`,
      [problemNumber],
    );
    if (!result.rowCount) return res.status(404).json({ message: 'Problema no encontrado.' });
    res.json({ problem: result.rows[0] });
  } catch (error) {
    console.error('Problem detail error:', error);
    res.status(500).json({ message: 'No se pudo consultar el problema.' });
  }
});

exports.progress = onRequest({ secrets: [databaseUrl] }, async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ message: 'Método no permitido.' });
  try {
    const token = await requireUser(req);
    const client = await db.connect();
    try {
      const userId = await getUserId(client, token);
      const user = await client.query(
        'SELECT global_rating, solved_count, attempted_count FROM users WHERE id = $1', [userId],
      );
      const mastery = await client.query(
        `SELECT t.name, utm.mastery_score, utm.attempts, utm.successes
         FROM user_tag_mastery utm JOIN tags t ON t.id = utm.tag_id
         WHERE utm.user_id = $1 ORDER BY utm.mastery_score ASC, t.name LIMIT 10`, [userId],
      );
      res.json({ user: user.rows[0], mastery: mastery.rows });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Progress error:', error);
    res.status(401).json({ message: error.message || 'No autorizado.' });
  }
});
