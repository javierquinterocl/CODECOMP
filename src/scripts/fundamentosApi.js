import { rutaApi } from './apiBase';

const URL_EJERCICIOS = rutaApi('fundamentos/ejercicios');
const URL_PROGRESO = rutaApi('fundamentos/progreso');
const URL_BORRADOR = rutaApi('fundamentos/borrador');

// La base llama `dificultad` a lo que las páginas llaman `nivel` (1 a 5), como en Problemas.
const mapEjercicio = (fila) => ({
  numero: fila.numero,
  tema: fila.tema,
  nivel: fila.dificultad,
  titulo: fila.titulo,
  resumen: fila.resumen,
  descripcion: fila.descripcion || [],
  entrada: fila.entrada,
  salida: fila.salida,
  ejemplos: fila.ejemplos || [],
  pistaConcepto: fila.pista_concepto || undefined,
});

const leer = async (response, porDefecto) => {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || porDefecto);
  return data;
};

let ejerciciosEnMemoria = null;

/** Los ejercicios de todos los niveles, agrupados por nivel: `{ fundamentos: [...], practica: [...] }`. */
export const getEjercicios = () => {
  if (!ejerciciosEnMemoria) {
    ejerciciosEnMemoria = fetch(URL_EJERCICIOS)
      .then((response) => leer(response, 'No se pudieron cargar los ejercicios.'))
      .then((data) => {
        const porNivel = {};
        for (const fila of data.ejercicios) (porNivel[fila.nivel] ||= []).push(mapEjercicio(fila));
        return porNivel;
      })
      .catch((error) => {
        // Un fallo no se queda en memoria: la siguiente visita lo intenta de nuevo.
        ejerciciosEnMemoria = null;
        throw error;
      });
  }
  return ejerciciosEnMemoria;
};

const conToken = async (user, extra = {}) => ({
  ...extra,
  headers: { ...extra.headers, Authorization: `Bearer ${await user.getIdToken()}` },
});

const enviar = async (user, url, cuerpo, extra = {}) => fetch(url, await conToken(user, {
  ...extra,
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(cuerpo),
}));

/** Último ejercicio visto en cada nivel: `{ fundamentos: 12, practica: 3 }`. */
export const getUltimasVisitas = async (user) => {
  if (!user) return {};
  const response = await fetch(URL_PROGRESO, await conToken(user));
  const data = await leer(response, 'No se pudo cargar tu avance.');
  const visitas = {};
  // Vienen de la más reciente a la más antigua: gana la primera de cada nivel.
  for (const fila of data.progreso) visitas[fila.nivel] ??= fila.numero;
  return visitas;
};

/** Registra la apertura. Devuelve los milisegundos desde la primera vez y el borrador guardado. */
export const abrirEjercicio = async (user, nivel, numero) => {
  const response = await enviar(user, URL_PROGRESO, { nivel, numero: Number(numero) });
  const data = await leer(response, 'No se pudo registrar la apertura.');
  return {
    // Las dos horas son del servidor: el reloj del navegador no cuenta.
    transcurrido: Math.max(0, new Date(data.ahora) - new Date(data.abierto_en)),
    codigo: data.codigo,
  };
};

export const guardarBorrador = async (user, nivel, numero, codigo, { alSalir = false } = {}) => {
  const response = await enviar(user, URL_BORRADOR, { nivel, numero: Number(numero), codigo }, { keepalive: alSalir });
  await leer(response, 'No se pudo guardar tu código.');
};
