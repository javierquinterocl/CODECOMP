// Preferencias de Fundamentos que son del navegador. El avance (qué ejercicio se
// abrió y cuándo, y el código escrito) viaja con la cuenta: ver fundamentosApi.js.

const CLAVE_TEMPORIZADOR = 'codecomp:fundamentos:temporizador';

// El avance vivía aquí antes de pasar a la base; esas dos claves ya no se leen.
try {
  localStorage.removeItem('codecomp:fundamentos:aperturas');
  localStorage.removeItem('codecomp:fundamentos:ultimo');
} catch {
  // Modo privado o almacenamiento bloqueado.
}

/** El temporizador de práctica viene apagado: lo enciende el estudiante. */
export const temporizadorActivo = () => {
  try {
    return JSON.parse(localStorage.getItem(CLAVE_TEMPORIZADOR))?.activo === true;
  } catch {
    return false;
  }
};

export const guardarTemporizador = (activo) => {
  try {
    localStorage.setItem(CLAVE_TEMPORIZADOR, JSON.stringify({ activo: Boolean(activo) }));
  } catch {
    // Sin persistencia vale solo para esta visita.
  }
};
