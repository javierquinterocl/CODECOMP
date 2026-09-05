const JUDGE0_PROXY_URL = import.meta.env.VITE_JUDGE0_PROXY_URL || '/api/judge0';
const ADAPTIVE_API_URL = import.meta.env.VITE_ADAPTIVE_API_URL || '/api/adaptive';

/** IDs de los lenguajes soportados por Judge0 CE en RapidAPI. */
export const JUDGE0_LANGUAGE_IDS = Object.freeze({
  python: 71,
  javascript: 63,
  java: 62,
  cpp: 54,
  csharp: 51,
  php: 68,
});

const STATUS_DESCRIPTIONS = Object.freeze({
  1: 'In Queue',
  2: 'Processing',
  3: 'Accepted',
  4: 'Wrong Answer',
  5: 'Time Limit Exceeded',
  6: 'Compilation Error',
  7: 'Runtime Error (SIGSEGV)',
  8: 'Runtime Error (SIGXFSZ)',
  9: 'Runtime Error (SIGFPE)',
  10: 'Runtime Error (SIGABRT)',
  11: 'Runtime Error (NZEC)',
  12: 'Runtime Error (Other)',
  13: 'Internal Error',
  14: 'Exec Format Error',
});

const formatMemory = (memory) => {
  if (memory === null || memory === undefined) return '-';
  const value = Number(memory);
  if (!Number.isFinite(value)) return '-';
  return value >= 1024 ? `${(value / 1024).toFixed(1)} MB` : `${value} KB`;
};

const formatTime = (time) => {
  if (time === null || time === undefined || time === '') return '-';
  return `${time} s`;
};

/** Convierte un estado de Judge0 en datos directamente utilizables por la vista. */
export const formatearEstadoJudge0 = (statusId, statusDescription) => {
  const description = statusDescription || STATUS_DESCRIPTIONS[statusId] || 'Unknown';
  let verdict = 'En procesamiento';
  let tone = 'pending';

  if (statusId === 3) {
    verdict = 'Aceptado';
    tone = 'success';
  } else if (statusId === 6) {
    verdict = 'Error de compilación';
    tone = 'error';
  } else if (statusId === 5) {
    verdict = 'Tiempo excedido';
    tone = 'error';
  } else if (statusId >= 7 && statusId <= 12) {
    verdict = 'Error de ejecución';
    tone = 'error';
  } else if (statusId === 4) {
    verdict = 'Respuesta incorrecta';
    tone = 'error';
  }

  return { verdict, tone, statusDescription: description };
};

const getErrorDetails = (submission) => {
  if (submission.status?.id === 6) return submission.compile_output || '';
  if (submission.status?.id >= 7 && submission.status?.id <= 12) return submission.stderr || '';
  return '';
};

/** Envía una solución a Judge0 y devuelve un resultado listo para presentar. */
export const evaluarCodigo = async (sourceCode, languageId, stdin = '', expectedOutput = '') => {
  if (!sourceCode?.trim()) throw new Error('Escribe una solución antes de enviarla.');
  if (!Number.isInteger(languageId)) throw new Error('El lenguaje seleccionado no es válido.');

  try {
    const submission = {
      source_code: sourceCode,
      language_id: languageId,
      stdin: stdin || '',
    };
    if (expectedOutput) submission.expected_output = expectedOutput;

    const response = await fetch(JUDGE0_PROXY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(submission),
    });

    const responseText = await response.text();
    let data;
    try {
      data = responseText ? JSON.parse(responseText) : {};
    } catch {
      data = { message: responseText };
    }
    if (!response.ok) {
      const detail = data.message || data.error || data.error_description;
      throw new Error(detail || `Judge0 respondió con HTTP ${response.status}.`);
    }

    const statusId = data.status?.id;
    const status = formatearEstadoJudge0(statusId, data.status?.description);
    return {
      stdout: data.stdout || '',
      time: formatTime(data.time),
      memory: formatMemory(data.memory),
      statusId,
      statusDescription: status.statusDescription,
      verdict: status.verdict,
      tone: status.tone,
      errorDetails: getErrorDetails(data),
    };
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('No se pudo evaluar el código en Judge0.');
  }
};

/** Envía un problema completo al backend para ejecutar sus casos y actualizar el perfil. */
export const evaluarCodigoAdaptativo = async (sourceCode, languageId, problemNumber, user) => {
  if (!user) throw new Error('Inicia sesión para guardar tu progreso.');
  const token = await user.getIdToken();
  const response = await fetch(ADAPTIVE_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ source_code: sourceCode, language_id: languageId, problem_number: problemNumber }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'No se pudo procesar el envío.');
  return data;
};
