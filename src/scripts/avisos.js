import { rutaApi } from './apiBase';
import { NIVELES } from './problemsData';

// Avisos de la campana: el servidor manda tipo y datos; aquí se arma el texto.
// Los leídos se recuerdan en este navegador (no hay tabla de notificaciones).

const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;

// Textos borrador: los aprueba el equipo.
const TEXTOS = {
  racha: ({ racha }) => ({
    titulo: `Tu racha de ${plural(racha, 'día', 'días')} sigue viva`,
    texto: 'Envía algo hoy para no perderla.',
    enlace: '/dashboard/problemas',
  }),
  cierre: ({ numero, titulo, quedan }) => ({
    titulo: `Te ${quedan === 1 ? 'queda 1 día' : `quedan ${quedan} días`} para resolver #${numero}`,
    texto: `${titulo}: si no lo resuelves, contará como no resuelto.`,
    enlace: `/dashboard/problemas/todos/${numero}`,
  }),
  escalon: ({ escalon }) => ({
    titulo: `Subiste al escalón «${NIVELES[escalon]}»`,
    texto: 'Ya te recomendamos problemas de este nivel.',
    enlace: '/dashboard/progreso',
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
};

export const textoDeAviso = (aviso) => TEXTOS[aviso.tipo]?.(aviso.datos) || null;

export const getAvisos = async (user) => {
  const response = await fetch(rutaApi('notificaciones'), {
    headers: { Authorization: `Bearer ${await user.getIdToken()}` },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || 'No se pudieron cargar tus avisos.');
  return data;
};

// localStorage puede fallar (modo privado): sin él, los avisos simplemente no se recuerdan.
const leer = (clave, porDefecto) => {
  try { return JSON.parse(localStorage.getItem(clave)) ?? porDefecto; } catch { return porDefecto; }
};
const guardar = (clave, valor) => {
  try { localStorage.setItem(clave, JSON.stringify(valor)); } catch { /* sin almacenamiento */ }
};

export const leidosDe = (uid) => new Set(leer(`codecomp:avisos-leidos:${uid}`, []));

export const marcarLeidos = (uid, ids) => {
  const todos = [...new Set([...leer(`codecomp:avisos-leidos:${uid}`, []), ...ids])].slice(-200);
  guardar(`codecomp:avisos-leidos:${uid}`, todos);
};

/** Aviso local de "subiste de escalón": compara con el último escalón que vio. */
export const avisoDeEscalon = (uid, escalon) => {
  if (!escalon) return null;
  const clave = `codecomp:escalon-visto:${uid}`;
  const visto = leer(clave, null);
  if (visto == null || escalon < visto) {
    guardar(clave, escalon); // primera vez (o bajó por un ajuste): no se avisa
    return null;
  }
  return escalon > visto ? { id: `escalon-${escalon}`, tipo: 'escalon', datos: { escalon } } : null;
};

export const verEscalon = (uid, escalon) => guardar(`codecomp:escalon-visto:${uid}`, escalon);
