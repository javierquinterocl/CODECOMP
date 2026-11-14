import { CATEGORIAS, categoriaDeProblema } from './problemsData';
import { JUDGE0_LANGUAGE_IDS, VEREDICTOS_ES } from './judge0Service';

// Textos borrador: los aprueba el equipo.
export const ALERTAS = {
  'sin-actividad': 'Sin actividad',
  inactivo: '7+ días sin entrar',
  atascado: 'Atascado',
  'en-caida': 'Nivel en caída',
};

export const veredictoEs = (v) => VEREDICTOS_ES[v] || (v === 'ERROR_JUEZ' ? 'Error del juez' : v);

const NOMBRES_LENGUAJE = { python: 'Python', javascript: 'JavaScript', java: 'Java', cpp: 'C++', csharp: 'C#', php: 'PHP' };
const LENGUAJE_POR_ID = Object.fromEntries(
  Object.entries(JUDGE0_LANGUAGE_IDS).map(([clave, id]) => [id, NOMBRES_LENGUAJE[clave] || clave]),
);
export const lenguajeDe = (id) => LENGUAJE_POR_ID[id] || `Lenguaje ${id}`;

// Las categorías por tema: Principiante va por dificultad y SQL y Otros no aplican al mapa.
export const CATEGORIAS_TEMA = CATEGORIAS.filter((c) => !['principiante', 'sql', 'otros'].includes(c.slug));

const categoriaDeTag = (tag) => categoriaDeProblema({ tags: [tag], dificultadRating: 99999 });

/** `{ [slug]: { intentos, aciertos } }` a partir de las filas de user_tag_mastery. */
export const temasPorCategoria = (filas) => {
  const total = {};
  for (const f of filas) {
    const slug = categoriaDeTag(f.tag);
    if (!CATEGORIAS_TEMA.some((c) => c.slug === slug)) continue;
    total[slug] ||= { intentos: 0, aciertos: 0 };
    total[slug].intentos += f.intentos;
    total[slug].aciertos += f.aciertos;
  }
  return total;
};

/** Nivel del mapa de calor: 0 sin datos, 1 bajo (<40 %), 2 medio, 3 alto (≥70 %). */
export const nivelDeCelda = (dato) => {
  if (!dato?.intentos) return 0;
  const tasa = dato.aciertos / dato.intentos;
  if (tasa < 0.4) return 1;
  return tasa < 0.7 ? 2 : 3;
};

export const porcentaje = (dato) => (dato?.intentos ? Math.round((dato.aciertos / dato.intentos) * 100) : null);

/** Suma de los últimos `n` días del mapa de actividad (el último día con datos es hoy). */
export const ultimosDias = (mapa, n) => {
  const dias = (mapa?.semanas || []).flat().filter(Boolean).slice(-n);
  return {
    segundos: dias.reduce((t, d) => t + d.segundos, 0),
    segundosEjercicios: dias.reduce((t, d) => t + d.segundosEjercicios, 0),
    envios: dias.reduce((t, d) => t + d.envios, 0),
  };
};

export const duracion = (segundos) => {
  const minutos = Math.round((segundos || 0) / 60);
  if (minutos < 60) return `${minutos} min`;
  return `${Math.floor(minutos / 60)} h ${minutos % 60} min`;
};

export const fecha = (valor) => (valor
  ? new Date(valor).toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
  : '—');

export const haceCuanto = (valor) => {
  if (!valor) return 'Nunca';
  const dias = Math.floor((Date.now() - new Date(valor).getTime()) / 86_400_000);
  if (dias <= 0) return 'Hoy';
  if (dias === 1) return 'Ayer';
  return `Hace ${dias} días`;
};

/** El username de Postgres termina en "-" y 7 letras del uid: se quita para mostrarlo. */
export const nombreVisible = (username) => String(username || '').replace(/-[A-Za-z0-9]{7}$/, '') || 'Estudiante';
