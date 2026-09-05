import { categoriaDeProblema } from './problemsData';

const API_URL = import.meta.env.VITE_PROBLEMS_API_URL || '/api/problems';

const subindices = { 0: '₀', 1: '₁', 2: '₂', 3: '₃', 4: '₄', 5: '₅', 6: '₆', 7: '₇', 8: '₈', 9: '₉' };

const limpiarTexto = (value = '') => String(value)
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
  .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
  .replace(/(?:<=|>=|≤|≥)(?:\s*(?:<=|>=|≤|≥)){1,}/g, (match) => match.includes('>=') || match.includes('≥') ? '≥' : '≤')
  .replace(/\*([a-zA-Z])\*(\d+)/g, (_, letter, number) => `${letter}${[...number].map((digit) => subindices[digit]).join('')}`)
  .replace(/\*([^*]+)\*/g, '$1')
  .replace(/`([^`]+)`/g, '$1')
  .replace(/[ \t]+\n/g, '\n')
  .replace(/\n{3,}/g, '\n\n')
  .trim();

const slugify = (value = '') => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export const mapProblem = (problem) => {
  const difficulty = Number(problem.difficulty_rating) || 1200;
  const nivel = Math.min(5, Math.max(1, Math.ceil((difficulty - 700) / 400)));
  const description = limpiarTexto(problem.description_markdown || problem.title);
  const tags = Array.isArray(problem.tags) ? problem.tags : [];
  const examples = (problem.examples || []).map((example) => ({
    entrada: example.input || '',
    salida: example.output || '',
  }));
  return {
    id: problem.id,
    numero: problem.problem_number,
    categoria: categoriaDeProblema({ tags }) || (tags[0] ? slugify(tags[0].name) : 'principiante'),
    titulo: limpiarTexto(problem.title),
    nivel,
    dificultadRating: difficulty,
    puntos: difficulty / 1000,
    tiempoLimite: Number(problem.time_limit_sec) || 1,
    memoriaLimite: Number(problem.memory_limit_mb) || 256,
    resumen: description.replace(/[#*`\n]+/g, ' ').trim().slice(0, 180),
    descripcion: description.split(/\n\s*\n/).map(limpiarTexto).filter(Boolean),
    entrada: 'Consulta los casos de prueba y las restricciones del enunciado.',
    salida: 'Imprime la respuesta solicitada por el enunciado.',
    ejemplos: examples,
    tags,
  };
};

const request = async (url) => {
  const response = await fetch(url);
  const text = await response.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`La API devolvió una respuesta inválida (HTTP ${response.status}).`);
  }
  if (!response.ok) throw new Error(data.message || `No se pudieron cargar los problemas (HTTP ${response.status}).`);
  return data;
};

export const getProblems = async ({ tag = '', limit = 500, offset = 0 } = {}) => {
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  if (tag) params.set('tag', tag);
  const data = await request(`${API_URL}?${params}`);
  return { ...data, problems: data.problems.map(mapProblem) };
};

export const getAllProblems = async (options = {}) => {
  const all = [];
  let offset = 0;
  const limit = 500;
  while (true) {
    const page = await getProblems({ ...options, limit, offset });
    all.push(...page.problems);
    if (page.problems.length < limit) return all;
    offset += limit;
  }
};

export const getProblem = async (problemNumber) => {
  const data = await request(`${API_URL}/${encodeURIComponent(problemNumber)}`);
  return mapProblem(data.problem);
};