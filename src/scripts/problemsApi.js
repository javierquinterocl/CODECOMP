import { categoriaDeProblema, nivelDeRating } from './problemsData';
import { rutaApi } from './apiBase';
import { bloquesDe, limpiarTexto, textoPlano } from './enunciado';

const API_URL = import.meta.env.VITE_PROBLEMS_API_URL || rutaApi('problems');

const slugify = (value = '') => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export const mapProblem = (problem) => {
  const difficulty = Number(problem.difficulty_rating) || 1200;
  const nivel = nivelDeRating(difficulty);
  const tituloOriginal = limpiarTexto(problem.title);
  const tituloEs = limpiarTexto(problem.title_es || '');
  const descriptionEn = problem.description_markdown || problem.title || '';
  const descriptionEs = problem.description_markdown_es || '';

  const tags = Array.isArray(problem.tags) ? problem.tags : [];
  const nombreTag = (tag) => (typeof tag === 'string' ? tag : tag?.name || '');
  const examples = (problem.examples || []).map((example) => ({
    entrada: example.input || '',
    salida: example.output || '',
  }));
  return {
    id: problem.id ?? problem.problem_number,
    numero: problem.problem_number,
    categoria: categoriaDeProblema({ tags, dificultadRating: difficulty }) || (tags[0] ? slugify(nombreTag(tags[0])) : 'principiante'),
    titulo: tituloOriginal,
    tituloEs,
    nivel,
    dificultadRating: difficulty,
    puntos: difficulty / 1000,
    tiempoLimite: Number(problem.time_limit_sec) || 1,
    memoriaLimite: Number(problem.memory_limit_mb) || 256,
    resumen: textoPlano(descriptionEn).replace(/[#`]+/g, ' ').trim().slice(0, 180),
    descripcion: bloquesDe(descriptionEn),
    textos: {
      es: descriptionEs ? { titulo: tituloEs || tituloOriginal, descripcion: bloquesDe(descriptionEs) } : null,
      en: { titulo: tituloOriginal, descripcion: bloquesDe(descriptionEn) },
    },
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

export const getProblems = async ({ tag = '', limit = 5000, offset = 0 } = {}) => {
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  if (tag) params.set('tag', tag);
  const data = await request(`${API_URL}?${params}`);
  return { ...data, problems: data.problems.map(mapProblem) };
};


let catalogoEnMemoria = null;

export const getAllProblems = async (options = {}) => {
  const sinFiltro = !options.tag;
  if (sinFiltro && catalogoEnMemoria) return catalogoEnMemoria;

  const limit = 5000;
  const todos = [];
  let offset = 0;
  for (;;) {
    const page = await getProblems({ ...options, limit, offset });
    todos.push(...page.problems);
    if (page.problems.length < limit) break;
    offset += limit;
  }

  if (sinFiltro) catalogoEnMemoria = todos;
  return todos;
};

export const getProblem = async (problemNumber) => {
  const data = await request(`${API_URL}/${encodeURIComponent(problemNumber)}`);
  return mapProblem(data.problem);
};