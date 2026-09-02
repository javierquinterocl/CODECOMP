const { onRequest } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');

const rapidApiKey = defineSecret('RAPIDAPI_KEY');
const JUDGE0_URL = 'https://judge0-ce.p.rapidapi.com/submissions?base64_encoded=false&wait=true';
const RAPIDAPI_HOST = 'judge0-ce.p.rapidapi.com';
const SUPPORTED_LANGUAGE_IDS = new Set([51, 54, 62, 63, 68, 71]);

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
