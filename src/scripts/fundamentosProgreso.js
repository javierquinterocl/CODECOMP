// Lo que el módulo Fundamentos recuerda de cada estudiante. Va en localStorage:
// es por navegador y no viaja con la cuenta. Sin juez no se sabe qué resolvió,
// así que solo se guarda dónde quedó y cuándo abrió cada ejercicio.

const CLAVE_APERTURAS = 'codecomp:fundamentos:aperturas';
const CLAVE_VISITAS = 'codecomp:fundamentos:ultimo';

const leer = (clave) => {
  try {
    const datos = JSON.parse(localStorage.getItem(clave));
    return datos && typeof datos === 'object' ? datos : {};
  } catch {
    // Modo privado o dato corrupto: se trata como primera visita.
    return {};
  }
};

const guardar = (clave, datos) => {
  try {
    localStorage.setItem(clave, JSON.stringify(datos));
  } catch {
    // Sin persistencia vale solo para esta visita.
  }
};

/** Instante en que se abrió el ejercicio por primera vez. Recargar no lo
    reinicia, y un ejercicio que ya se desbloqueó no vuelve a bloquearse. */
export const aperturaDe = (nivelSlug, numero) => {
  const aperturas = leer(CLAVE_APERTURAS);
  const clave = `${nivelSlug}:${numero}`;
  const guardada = Number(aperturas[clave]);
  // Una fecha en el futuro solo puede venir de un reloj cambiado.
  if (guardada > 0 && guardada <= Date.now()) return guardada;

  const ahora = Date.now();
  guardar(CLAVE_APERTURAS, { ...aperturas, [clave]: ahora });
  return ahora;
};

/** Recuerda el último ejercicio abierto en cada nivel. */
export const registrarVisita = (nivelSlug, numero) => {
  guardar(CLAVE_VISITAS, { ...leer(CLAVE_VISITAS), [nivelSlug]: Number(numero) });
};

/** Número del último ejercicio abierto en ese nivel, o null si nunca entró. */
export const ultimaVisita = (nivelSlug) => {
  const numero = Number(leer(CLAVE_VISITAS)[nivelSlug]);
  return Number.isInteger(numero) && numero > 0 ? numero : null;
};
