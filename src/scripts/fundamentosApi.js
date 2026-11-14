import { rutaApi } from './apiBase';

const URL_EJERCICIOS = rutaApi('fundamentos/ejercicios');
const URL_PROGRESO = rutaApi('fundamentos/progreso');
const URL_BORRADOR = rutaApi('fundamentos/borrador');
const URL_ENVIO = rutaApi('fundamentos/envio');
const URL_PISTA = rutaApi('fundamentos/pista');

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

/**
 * Avance por nivel: el último ejercicio visto (`visitas`, ej. `{ fundamentos: 12 }`) y los
 * resueltos, con al menos un envío aceptado (`resueltos`, ej. `{ fundamentos: Set{1, 2} }`).
 */
export const getAvance = async (user) => {
  if (!user) return { visitas: {}, resueltos: {} };
  const response = await fetch(URL_PROGRESO, await conToken(user));
  const data = await leer(response, 'No se pudo cargar tu avance.');
  const visitas = {};
  // Vienen de la más reciente a la más antigua: gana la primera de cada nivel.
  for (const fila of data.progreso) visitas[fila.nivel] ??= fila.numero;
  const resueltos = {};
  for (const fila of data.resueltos || []) (resueltos[fila.nivel] ||= new Set()).add(fila.numero);
  return { visitas, resueltos };
};

/** Registra la apertura y devuelve el borrador guardado. */
export const abrirEjercicio = async (user, nivel, numero) => {
  const response = await enviar(user, URL_PROGRESO, { nivel, numero: Number(numero) });
  const data = await leer(response, 'No se pudo registrar la apertura.');
  return { codigo: data.codigo };
};

export const guardarBorrador = async (user, nivel, numero, codigo, { alSalir = false } = {}) => {
  const response = await enviar(user, URL_BORRADOR, { nivel, numero: Number(numero), codigo }, { keepalive: alSalir });
  await leer(response, 'No se pudo guardar tu código.');
};

/** Evalúa el código con el juez de PSeInt. Si falla, el error lleva el `codigo` del servidor. */
export const enviarSolucion = async (user, nivel, numero, codigo) => {
  const response = await enviar(user, URL_ENVIO, { nivel, numero: Number(numero), codigo });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw Object.assign(new Error(data.message || 'No se pudo evaluar tu solución.'), { codigo: data.codigo });
  }
  return data;
};

/**
 * Pide al tutor de IA una pista sobre un envío ya evaluado. Si hay que esperar, el error
 * lleva `reintentarEn` en segundos (la espera es la misma que la de Problemas).
 */
export const pedirPistaFundamentos = async (user, envioId) => {
  const response = await enviar(user, URL_PISTA, { envio_id: envioId });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw Object.assign(new Error(data.message || 'No se pudo pedir la pista.'), {
      reintentarEn: Number(response.headers.get('Retry-After')) || 0,
    });
  }
  return data.hint || '';
};