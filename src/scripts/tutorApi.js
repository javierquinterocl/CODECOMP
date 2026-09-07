import { rutaApi } from './apiBase';

const TUTOR_API_URL = import.meta.env.VITE_TUTOR_API_URL || rutaApi('tutor');


export const pedirPista = async ({ user, problemNumber, sourceCode, verdict, judgeOutput, language }) => {
  if (!user) throw new Error('Inicia sesión para pedir una pista.');

  const token = await user.getIdToken();
  const response = await fetch(TUTOR_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      problem_number: problemNumber,
      source_code: sourceCode,
      verdict,
      judge_output: judgeOutput || '',
      language: language || '',
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || 'No se pudo pedir la pista.');
  return data.hint || '';
};
