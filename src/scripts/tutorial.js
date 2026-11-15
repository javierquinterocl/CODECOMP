// Estado del recorrido guiado, por usuario y en este navegador (localStorage).
// estado: 'ofrecido' (aún no responde), 'en-curso' (con paso), 'hecho' o 'saltado'.

const clave = (uid) => `codecomp:tutorial:${uid}`;
export const EVENTO_TUTORIAL = 'codecomp:tutorial';

export const leerTutorial = (uid) => {
  try {
    return JSON.parse(localStorage.getItem(clave(uid))) ?? { estado: 'ofrecido', paso: 0 };
  } catch {
    return { estado: 'ofrecido', paso: 0 };
  }
};

export const guardarTutorial = (uid, valor) => {
  try {
    localStorage.setItem(clave(uid), JSON.stringify(valor));
  } catch {
    // Sin almacenamiento, el recorrido vale para esta visita.
  }
  window.dispatchEvent(new CustomEvent(EVENTO_TUTORIAL, { detail: valor }));
};

/** Empieza (o repite) el recorrido desde el primer paso. */
export const iniciarTutorial = (uid) => guardarTutorial(uid, { estado: 'en-curso', paso: 0 });
