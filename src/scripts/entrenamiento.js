// Ruta por temas y repaso espaciado: funciones puras sobre el catálogo (en memoria) y los datos
// del estudiante (GET /entrenamiento). Textos borrador: los decide el equipo.

import { CATEGORIAS, categoriaDeProblema } from './problemsData.js';

// Orden de aprendizaje: de lo básico a lo que se apoya en todo lo anterior.
export const ORDEN_RUTA = [
  { slug: 'principiante', idea: 'Leer la entrada, hacer cuentas y escribir la salida exacta. La base de todo lo demás.' },
  { slug: 'ad-hoc', idea: 'Problemas sin receta: observar el caso, probar ejemplos pequeños y encontrar el patrón.' },
  { slug: 'cadenas', idea: 'Recorrer y comparar textos: caracteres, subcadenas, palíndromos y conteos.' },
  { slug: 'matematicas', idea: 'Divisibilidad, primos, MCD y aritmética modular para no recorrer números uno por uno.' },
  { slug: 'estructuras-de-datos', idea: 'Elegir dónde guardar los datos (pilas, colas, mapas, conjuntos) para responder rápido.' },
  { slug: 'paradigmas', idea: 'Voraz, búsqueda binaria, dividir y vencer y programación dinámica: formas de atacar un problema.' },
  { slug: 'grafos', idea: 'Modelar conexiones como nodos y aristas y recorrerlas con BFS, DFS y caminos mínimos.' },
  { slug: 'geometria', idea: 'Puntos, rectas y polígonos con cuidado en la precisión y los casos borde.' },
];

export const META_TEMA = 5;
const INTERVALOS = [1, 3, 7, 14, 30]; // días hasta el próximo repaso según los aciertos
const DIA_MS = 24 * 60 * 60 * 1000;

// Misma agrupación que el mapa de temas del docente (sin principiante, sql ni otros), con la
// última vez que practicó cada tema.
const SIN_TEMA = ['principiante', 'sql', 'otros'];
const temasConFecha = (filas) => {
  const total = {};
  for (const f of filas) {
    const slug = categoriaDeProblema({ tags: [f.tag], dificultadRating: 99999 });
    if (SIN_TEMA.includes(slug)) continue;
    total[slug] ||= { intentos: 0, aciertos: 0, ultimo: null };
    total[slug].intentos += f.intentos;
    total[slug].aciertos += f.aciertos;
    if (f.ultimo && (!total[slug].ultimo || new Date(f.ultimo) > new Date(total[slug].ultimo))) total[slug].ultimo = f.ultimo;
  }
  return total;
};

const tituloDe = (slug) => CATEGORIAS.find((c) => c.slug === slug)?.titulo ?? slug;
const nivelValido = (nivel) => (Number.isFinite(nivel) && nivel > 0 ? nivel : 800);

/**
 * Temas en orden con su avance. Cada tema propone 5 problemas sin resolver desde un poco por
 * debajo del nivel del estudiante hacia arriba. Ninguno se bloquea: el primero sin dominar es el
 * recomendado.
 */
export const rutaDeTemas = (catalogo, resueltos, nivel) => {
  const hechos = resueltos instanceof Set ? resueltos : new Set(resueltos);
  const desde = nivelValido(nivel) - 200;
  let recomendadoPuesto = false;
  return ORDEN_RUTA.map(({ slug, idea }) => {
    const delTema = catalogo.filter((p) => p.categoria === slug)
      .sort((a, b) => a.dificultadRating - b.dificultadRating);
    if (!delTema.length) return null;
    const resueltosTema = delTema.filter((p) => hechos.has(p.numero)).length;
    const pendientes = delTema.filter((p) => !hechos.has(p.numero));
    const aLaAltura = pendientes.filter((p) => p.dificultadRating >= desde);
    const propuestos = (aLaAltura.length >= META_TEMA ? aLaAltura : pendientes).slice(0, META_TEMA);
    let estado = resueltosTema >= META_TEMA ? 'dominado' : resueltosTema > 0 ? 'en-curso' : 'por-empezar';
    const recomendado = estado !== 'dominado' && !recomendadoPuesto;
    if (recomendado) recomendadoPuesto = true;
    if (recomendado && estado === 'por-empezar') estado = 'recomendado';
    return {
      slug, titulo: tituloDe(slug), idea, total: delTema.length,
      resueltos: Math.min(resueltosTema, META_TEMA), estado, recomendado, propuestos,
    };
  }).filter(Boolean);
};

/**
 * Hasta 3 problemas para hoy en los temas donde más falla o que tocan repasar: un tema bien
 * resuelto vuelve a los 1, 3, 7, 14 y 30 días según sus aciertos. Cada uno dice por qué.
 */
export const repasoDeHoy = (porTag, resueltos, catalogo, nivel, hoy = new Date()) => {
  const hechos = resueltos instanceof Set ? resueltos : new Set(resueltos);
  const objetivo = nivelValido(nivel);
  const temas = Object.entries(temasConFecha(porTag ?? []))
    .filter(([, d]) => d.intentos > 0)
    .map(([slug, d]) => {
      const tasa = d.aciertos / d.intentos;
      const dias = d.ultimo ? Math.max(0, Math.floor((hoy - new Date(d.ultimo)) / DIA_MS)) : 30;
      const intervalo = INTERVALOS[Math.min(d.aciertos, INTERVALOS.length - 1)];
      const debil = d.intentos >= 2 && tasa < 0.6;
      const vencido = dias >= intervalo;
      return { slug, d, tasa, dias, debil, vencido, prioridad: (1 - tasa) * 2 + Math.min(dias / intervalo, 3) };
    })
    .filter((t) => t.debil || t.vencido)
    .sort((a, b) => b.prioridad - a.prioridad);

  const repaso = [];
  for (const t of temas) {
    if (repaso.length === 3) break;
    const candidatos = catalogo.filter((p) => p.categoria === t.slug && !hechos.has(p.numero));
    if (!candidatos.length) continue;
    // El más cercano al nivel, sin pasarse mucho por encima.
    const problema = candidatos.reduce((mejor, p) => {
      const costo = (q) => Math.abs(q.dificultadRating - objetivo) + (q.dificultadRating > objetivo + 150 ? 300 : 0);
      return costo(p) < costo(mejor) ? p : mejor;
    });
    const titulo = tituloDe(t.slug);
    const hace = t.dias === 1 ? 'hace 1 día' : `hace ${t.dias} días`;
    const motivo = t.debil
      ? `Aciertas ${Math.round(t.tasa * 100)} % de tus envíos en ${titulo}${t.dias > 0 ? ` y no lo practicas ${hace}` : ''}.`
      : `Repaso programado: no practicas ${titulo} ${hace}.`;
    repaso.push({ slug: t.slug, titulo, motivo, problema });
  }
  return repaso;
};
