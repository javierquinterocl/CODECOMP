import { rutaApi } from './apiBase';
import { NIVELES } from './problemsData';

// Avisos de la campana: el servidor manda tipo y datos; aquí se arma el texto.
// Los avisos y su estado de leído viven en la cuenta (tabla notificaciones).

const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;

const cuando = (iso) =>
  new Date(iso).toLocaleString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit' });

// Textos borrador: los aprueba el equipo.
const TEXTOS = {
  racha: ({ racha }) => ({
    titulo: `Tu racha de ${plural(racha, 'día', 'días')} sigue viva`,
    texto: 'Envía algo hoy para no perderla.',
    enlace: '/dashboard/problemas',
  }),
  cierre: ({ numero, titulo, quedan }) => ({
    titulo: `Te quedan ${quedan} días para resolver #${numero}`,
    texto: `${titulo}: si no lo resuelves, contará como no resuelto.`,
    enlace: `/dashboard/problemas/todos/${numero}`,
  }),
  cierre_1d: ({ problemas = [] }) => ({
    titulo: problemas.length === 1
      ? `Mañana se cierra #${problemas[0].numero}`
      : `Mañana se cierran ${problemas.length} problemas que intentaste`,
    texto: problemas.map((p) => `#${p.numero} ${p.titulo}`).join(' · '),
    enlace: problemas.length === 1 ? `/dashboard/problemas/todos/${problemas[0].numero}` : '/dashboard/problemas',
  }),
  resuelto: ({ numero, nivel, modulo }) => (modulo === 'fundamentos'
    ? {
      titulo: `Resolviste el ejercicio ${numero} de Fundamentos`,
      texto: 'Sigue con el siguiente cuando quieras.',
      enlace: `/dashboard/fundamentos/${nivel}`,
    }
    : {
      titulo: `Resolviste el problema #${numero}`,
      texto: 'Ya cuenta para tu nivel y tus resueltos.',
      enlace: '/dashboard/progreso',
    }),
  escalon: ({ escalon }) => ({
    titulo: `Subiste al escalón «${NIVELES[escalon]}»`,
    texto: 'Ya te recomendamos problemas de este nivel.',
    enlace: '/dashboard/progreso',
  }),
  jurado: ({ competencia, general }) => ({
    titulo: `El jurado respondió en ${competencia}`,
    texto: general ? 'Hay una aclaración para todos los equipos.' : 'Hay una aclaración para tu equipo.',
    enlace: '/dashboard/competencias',
  }),
  docente: ({ titulo, texto, clase }) => ({
    titulo: `${clase}: ${titulo}`,
    texto,
    enlace: '/dashboard',
  }),
  competencia_1d: ({ competencia, inicio }) => ({
    titulo: `Mañana empieza ${competencia}`,
    texto: `Empieza el ${cuando(inicio)}`,
    enlace: '/dashboard/competencias',
  }),
  competencia_1h: ({ competencia, inicio }) => ({
    titulo: `${competencia} empieza en menos de una hora`,
    texto: `Empieza a las ${new Date(inicio).toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' })}. Revisa tu equipo.`,
    enlace: '/dashboard/competencias',
  }),
  alertas: ({ cantidad, clase }) => ({
    titulo: `${plural(cantidad, 'estudiante', 'estudiantes')} con alertas`,
    texto: `En ${clase}: revisa quién está atascado o lleva días sin entrar.`,
    enlace: '/historial-usuarios',
  }),
  nuevos: ({ cantidad, clase }) => ({
    titulo: `${plural(cantidad, 'estudiante nuevo', 'estudiantes nuevos')} esta semana`,
    texto: `Entraron a ${clase} con el código de la clase.`,
    enlace: '/historial-usuarios',
  }),
  borrado: () => ({
    titulo: 'Nueva solicitud de borrado de datos',
    texto: 'Un estudiante pidió borrar sus datos. Revísala en Mi cuenta.',
    enlace: '/dashboard/cuenta',
  }),
  resumen_semanal: ({ clases = [] }) => ({
    titulo: 'Resumen semanal de tus clases',
    texto: clases.map((c) => `${c.nombre}: ${c.activos} resolvieron algo, ${c.alertas} con alertas`).join(' · '),
    enlace: '/historial-usuarios',
  }),
};

export const textoDeAviso = (aviso) => TEXTOS[aviso.tipo]?.(aviso.datos || {}) || null;

const conToken = async (user, extra = {}) => ({
  ...extra,
  headers: { ...extra.headers, Authorization: `Bearer ${await user.getIdToken()}` },
});

const leer = async (response) => {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || 'No se pudieron cargar tus avisos.');
  return data;
};

/** `{ notificaciones: [{ id, tipo, datos, creada_en, leida }], sin_leer }` */
export const getAvisos = async (user) => leer(await fetch(rutaApi('notificaciones'), await conToken(user)));

/** Marca leídos en la cuenta: una lista de ids o todos. Devuelve la lista actualizada. */
export const marcarLeidas = async (user, ids) => leer(await fetch(rutaApi('notificaciones/leidas'), await conToken(user, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(ids === 'todas' ? { todas: true } : { ids }),
})));
