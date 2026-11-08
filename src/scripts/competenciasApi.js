import { rutaApi } from './apiBase';

const leer = async (response, porDefecto) => {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || porDefecto);
  return data;
};

const pedir = async (user, ruta, cuerpo) => fetch(rutaApi(ruta), {
  method: cuerpo === undefined ? 'GET' : 'POST',
  headers: {
    Authorization: `Bearer ${await user.getIdToken()}`,
    ...(cuerpo === undefined ? {} : { 'Content-Type': 'application/json' }),
  },
  body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
});

/** Concurso actual, equipo del estudiante, problemas y lenguajes. */
export const getCompetencia = async (user) =>
  leer(await pedir(user, 'competencias'), 'No se pudo cargar la competencia.');

export const getMisEnvios = async (user) =>
  leer(await pedir(user, 'competencias/envios'), 'No se pudieron cargar tus envíos.');

export const getMarcador = async (user) =>
  leer(await pedir(user, 'competencias/marcador'), 'No se pudo cargar el marcador.');

export const enviarSolucion = async (user, problema, lenguaje, codigo) =>
  leer(await pedir(user, 'competencias/envio', { problema, lenguaje, codigo }), 'El juez no recibió el envío.');

/** El PDF del enunciado como URL local (blob); quien la pide la libera. */
export const getEnunciado = async (user, problema) => {
  const r = await pedir(user, `competencias/enunciado/${encodeURIComponent(problema)}`);
  if (!r.ok) {
    const data = await r.json().catch(() => ({}));
    throw new Error(data.message || 'No se pudo abrir el enunciado.');
  }
  return URL.createObjectURL(await r.blob());
};
