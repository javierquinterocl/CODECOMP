// Datos del reporte de la clase (PDF y Excel), calculados una vez a partir del panel docente.
// Función pura: los nombres y las alertas se traducen con las funciones que recibe.

import { CATEGORIAS, categoriaDeProblema } from './problemsData.js';

const DIA_MS = 86_400_000;
const SIN_TEMA = ['principiante', 'sql', 'otros'];
export const RANGOS_NIVEL = [
  { etiqueta: 'Menos de 900', hasta: 900 },
  { etiqueta: '900 – 1099', hasta: 1100 },
  { etiqueta: '1100 – 1299', hasta: 1300 },
  { etiqueta: '1300 – 1499', hasta: 1500 },
  { etiqueta: '1500 o más', hasta: Infinity },
];
export const SEMAFORO = {
  'al-dia': 'Al día',
  'en-riesgo': 'En riesgo',
  'sin-actividad': 'Sin actividad',
};

const estadoDe = (e, hoy) => {
  if (!e.ultimaActividad || (e.alertas ?? []).includes('sin-actividad')) return 'sin-actividad';
  if ((e.alertas ?? []).length || hoy - new Date(e.ultimaActividad) > 7 * DIA_MS) return 'en-riesgo';
  return 'al-dia';
};

/**
 * { clase, docente, fecha, resumen, niveles, resueltos, temas, actividad, problemas, estudiantes,
 *   acompanar } a partir de lo que devuelve GET /docente/clase/:id.
 */
export const datosDelReporte = (panel, { nombre = (n) => n, alerta = (a) => a, docente = '', hoy = new Date() } = {}) => {
  const lista = panel?.estudiantes ?? [];
  const estudiantes = lista.map((e) => {
    const estado = estadoDe(e, hoy);
    return {
      nombre: nombre(e.username) || e.email || 'Sin nombre',
      correo: e.email ?? '',
      nivel: Math.round(Number(e.nivel) || 0),
      problemas: e.resueltos ?? 0,
      fundamentos: e.fundamentosResueltos ?? 0,
      resueltos: (e.resueltos ?? 0) + (e.fundamentosResueltos ?? 0),
      envios: e.envios ?? 0,
      minutosSemana: Math.round((e.segundosSemana ?? 0) / 60),
      ultimaActividad: e.ultimaActividad ? new Date(e.ultimaActividad) : null,
      diasSinEntrar: e.ultimaActividad ? Math.floor((hoy - new Date(e.ultimaActividad)) / DIA_MS) : null,
      alertas: (e.alertas ?? []).map(alerta),
      estado,
    };
  }).sort((a, b) => b.nivel - a.nivel || b.resueltos - a.resueltos);

  const n = estudiantes.length;
  const activos = estudiantes.filter((e) => e.diasSinEntrar !== null && e.diasSinEntrar < 7).length;

  // Dominio de la clase por tema: aciertos sobre intentos de todos sus estudiantes.
  const porTema = {};
  for (const fila of panel?.temas ?? []) {
    const slug = categoriaDeProblema({ tags: [fila.tag], dificultadRating: 99999 });
    if (SIN_TEMA.includes(slug)) continue;
    porTema[slug] ||= { intentos: 0, aciertos: 0 };
    porTema[slug].intentos += Number(fila.intentos) || 0;
    porTema[slug].aciertos += Number(fila.aciertos) || 0;
  }
  const temas = CATEGORIAS.filter((c) => porTema[c.slug]?.intentos)
    .map((c) => ({ tema: c.titulo, intentos: porTema[c.slug].intentos, aciertos: porTema[c.slug].aciertos, porcentaje: Math.round((porTema[c.slug].aciertos / porTema[c.slug].intentos) * 100) }))
    .sort((a, b) => a.porcentaje - b.porcentaje);

  return {
    clase: panel?.clase?.nombre ?? 'Clase',
    docente,
    fecha: hoy,
    resumen: {
      estudiantes: n,
      activos,
      nivelPromedio: n ? Math.round(estudiantes.reduce((s, e) => s + e.nivel, 0) / n) : 0,
      resueltos: estudiantes.reduce((s, e) => s + e.resueltos, 0),
      envios: estudiantes.reduce((s, e) => s + e.envios, 0),
      conAlertas: estudiantes.filter((e) => e.alertas.length).length,
    },
    niveles: RANGOS_NIVEL.map((r, k) => ({
      etiqueta: r.etiqueta,
      cantidad: estudiantes.filter((e) => e.nivel < r.hasta && (k === 0 || e.nivel >= RANGOS_NIVEL[k - 1].hasta)).length,
    })),
    resueltos: [...estudiantes].sort((a, b) => b.resueltos - a.resueltos).slice(0, 15)
      .map((e) => ({ nombre: e.nombre, problemas: e.problemas, fundamentos: e.fundamentos })),
    temas,
    actividad: (panel?.actividad ?? []).slice(-14).map((d) => ({ dia: d.dia, minutos: Math.round((d.segundos ?? 0) / 60), estudiantes: d.estudiantes ?? 0 })),
    problemas: (panel?.problemas ?? []).slice(0, 10).map((p) => ({
      problema: `#${p.numero} ${p.titulo_es || p.titulo}`, fallos: p.fallos ?? 0, resolvieron: p.resolvieron ?? 0, intentaron: p.intentaron ?? 0,
    })),
    estudiantes,
    acompanar: estudiantes.filter((e) => e.estado !== 'al-dia')
      .sort((a, b) => (b.diasSinEntrar ?? 999) - (a.diasSinEntrar ?? 999))
      .map((e) => ({ nombre: e.nombre, motivo: e.alertas.length ? e.alertas.join(', ') : `${e.diasSinEntrar} días sin entrar`, estado: e.estado })),
  };
};

/** Nombre de archivo seguro: reporte-<clase>-<fecha>.<ext> */
export const archivoDelReporte = (clase, ext, fecha = new Date()) => {
  const base = String(clase ?? 'clase').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'clase';
  return `reporte-${base}-${fecha.toISOString().slice(0, 10)}.${ext}`;
};
