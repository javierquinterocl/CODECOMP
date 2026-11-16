import { CATEGORIAS, categoriaDeProblema } from './problemsData';
import { JUDGE0_LANGUAGE_IDS, VEREDICTOS_ES } from './judge0Service';

// Textos borrador: los aprueba el equipo.
export const ALERTAS = {
  'sin-actividad': 'Sin actividad',
  inactivo: '7+ días sin entrar',
  atascado: 'Atascado en un problema',
  'en-caida': 'Nivel en caída',
  meseta: 'Estancado: 3 semanas sin subir',
  pistas: 'Depende de pistas avanzadas',
  'atascado-fundamentos': 'Atascado en Fundamentos',
  pegado: 'Resueltos con pegado',
};

const MOTIVOS_PEGADO = {
  'sobre-nivel': 'al primer intento y muy por encima de su nivel',
  'poco-tiempo': 'con menos de 2 minutos en el ejercicio',
};
export const motivoPegado = (m) => MOTIVOS_PEGADO[m] || m;

// Consejos para el propio estudiante en Mi progreso. Textos borrador: los decide el equipo.
const CONSEJOS = {
  atascado: 'Llevas varios fallos en un mismo problema. Pide la pista 1 o déjalo y vuelve mañana con la cabeza fresca.',
  'en-caida': 'Tu nivel bajó estas dos semanas. Repasa en Mi progreso qué problemas se cerraron sin resolver.',
  meseta: 'Llevas 3 semanas practicando sin subir. Prueba un tema nuevo de la Ruta o problemas un poco más difíciles.',
  pistas: 'Casi siempre resuelves con la pista 2 o 3. Intenta un rato más con la pista 1 antes de pedir las demás.',
  'atascado-fundamentos': 'Fallas varias veces el mismo ejercicio de Fundamentos. Lee el mensaje del gato y prueba con los ejemplos a mano.',
};

const ETIQUETAS_PROPIAS = {
  atascado: 'Atascado en un problema',
  'en-caida': 'Tu nivel bajó',
  meseta: '3 semanas sin subir',
  pistas: 'Dependes de las pistas avanzadas',
  'atascado-fundamentos': 'Atascado en Fundamentos',
};

/** Etiqueta de una alerta dicha al estudiante ("tema:graphs" → "Te cuesta Grafos"). */
export const etiquetaPropia = (alerta) => (String(alerta).startsWith('tema:') ? `Te cuesta ${temaDeAlerta(alerta).titulo}` : ETIQUETAS_PROPIAS[alerta] || etiquetaAlerta(alerta));

/** Consejo para el estudiante; el del tema lo manda a su lección de la Ruta. */
export const consejoAlerta = (alerta) => {
  if (String(alerta).startsWith('tema:')) {
    return `En ${temaDeAlerta(alerta).titulo} fallas más de lo que aciertas. Repasa la lección del tema en la Ruta antes de seguir.`;
  }
  return CONSEJOS[alerta] ?? '';
};

/** Enlace del consejo: la lección del tema o la Ruta. */
export const enlaceConsejo = (alerta) => (String(alerta).startsWith('tema:') ? `/dashboard/ruta/${temaDeAlerta(alerta).slug}` : null);

// Qué puede hacer el docente con cada alerta. Textos borrador: los decide el equipo.
const SUGERENCIAS = {
  'sin-actividad': 'Escríbele o recuérdale entrar: todavía no ha practicado.',
  inactivo: 'Envía un aviso a la clase o habla con él: lleva una semana sin entrar.',
  atascado: 'Revisa su último código en la ficha y oriéntalo con una pregunta, sin darle la solución.',
  'en-caida': 'Revisa en su ficha qué problemas falló estas dos semanas.',
  meseta: 'Practica pero no avanza: proponle un tema nuevo de la Ruta o subirle el escalón.',
  pistas: 'Anímalo a intentar más con la pista 1 antes de pedir las demás, y repasa con él la idea clave.',
  'atascado-fundamentos': 'Revisa su envío de PSeInt en la ficha: falla varias veces el mismo ejercicio.',
  pegado: 'Es una señal, no una prueba. Pídele que te explique su solución o que resuelva uno parecido contigo.',
};

const temaDeAlerta = (alerta) => {
  const tag = alerta.slice('tema:'.length);
  const slug = categoriaDeProblema({ tags: [tag], dificultadRating: 99999 });
  return { slug, titulo: ['otros', 'principiante'].includes(slug) ? tag : (CATEGORIAS.find((c) => c.slug === slug)?.titulo ?? tag) };
};

/** Texto de una alerta, incluida la del tema ("tema:graphs" → "No avanza en Grafos"). */
export const etiquetaAlerta = (alerta) => (String(alerta).startsWith('tema:') ? `No avanza en ${temaDeAlerta(alerta).titulo}` : ALERTAS[alerta] || alerta);

/** Qué hacer con una alerta; la del tema recomienda su lección de la Ruta. */
export const sugerenciaAlerta = (alerta) => {
  if (String(alerta).startsWith('tema:')) {
    const { slug, titulo } = temaDeAlerta(alerta);
    return `Falla una y otra vez en ${titulo}: recomiéndale la lección del tema en la Ruta (/dashboard/ruta/${slug}).`;
  }
  return SUGERENCIAS[alerta] ?? '';
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

/** Fecha de un día YYYY-MM-DD en palabras: «sábado, 15 de noviembre de 2026». */
export const fechaLarga = (dia) => new Date(`${dia}T12:00:00Z`).toLocaleDateString('es-CO', {
  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
});

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
