// Textos y formatos compartidos por las páginas de Competencias. Textos borrador: los aprueba el equipo.

export const ESTADOS = {
  antes: 'Programada',
  'en-curso': 'En curso',
  terminado: 'Terminada',
  'sin-juez': 'Sin juez',
};

const FORMATO = new Intl.DateTimeFormat('es-CO', {
  timeZone: 'America/Bogota',
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
});

/** "jue, 20 nov, 2:00 p. m." en hora de Bogotá. */
export const fechaCorta = (iso) => (iso ? FORMATO.format(new Date(iso)) : '—');

/** Valor de un <input type="datetime-local"> (hora de Bogotá) a ISO con desfase -05:00. */
export const isoDesdeLocal = (valor) => (valor ? new Date(`${valor}:00-05:00`).toISOString() : '');

/** ISO a valor de <input type="datetime-local"> en hora de Bogotá. */
export const localDesdeIso = (iso) => {
  if (!iso) return '';
  const d = new Date(new Date(iso).getTime() - 5 * 3600_000);
  return d.toISOString().slice(0, 16);
};

export const LETRAS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
