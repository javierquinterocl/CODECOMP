import { rutaApi } from './apiBase';

const leer = async (response, porDefecto) => {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || porDefecto);
  return data;
};

const pedir = async (user, ruta, { metodo, cuerpo, formulario, porDefecto }) => leer(
  await fetch(rutaApi(`jurado/${ruta}`), {
    method: metodo || (cuerpo || formulario ? 'POST' : 'GET'),
    headers: {
      Authorization: `Bearer ${await user.getIdToken()}`,
      ...(cuerpo ? { 'Content-Type': 'application/json' } : {}),
    },
    body: formulario || (cuerpo ? JSON.stringify(cuerpo) : undefined),
  }),
  porDefecto,
);

const enc = encodeURIComponent;

export const getCompetenciasJurado = (user) =>
  pedir(user, 'competencias', { porDefecto: 'No se pudieron cargar las competencias.' });

/** `{ nombre, inicio (ISO), duracionMin, congeladoMin }` → `{ cid }`. */
export const crearCompetencia = (user, datos) =>
  pedir(user, 'competencias', { cuerpo: datos, porDefecto: 'No se pudo crear la competencia.' });

export const getCompetenciaJurado = (user, cid) =>
  pedir(user, `competencias/${enc(cid)}`, { porDefecto: 'No se pudo cargar la competencia.' });

export const cambiarInicio = (user, cid, inicio) =>
  pedir(user, `competencias/${enc(cid)}/inicio`, { cuerpo: { inicio }, porDefecto: 'No se pudo cambiar la hora.' });

export const archivarCompetencia = (user, cid, archivada) =>
  pedir(user, `competencias/${enc(cid)}/archivar`, { cuerpo: { archivada }, porDefecto: 'No se pudo archivar.' });

/** Devuelve `{ teamId, usuario, clave }`: la clave de respaldo solo se ve esta vez. */
export const crearEquipo = (user, cid, nombre) =>
  pedir(user, `competencias/${enc(cid)}/equipos`, { cuerpo: { nombre }, porDefecto: 'No se pudo crear el equipo.' });

export const editarEquipo = (user, cid, teamId, cambios) =>
  pedir(user, `competencias/${enc(cid)}/equipos/${enc(teamId)}`, { cuerpo: cambios, porDefecto: 'No se pudo guardar el equipo.' });

export const nuevaClaveEquipo = (user, cid, teamId) =>
  pedir(user, `competencias/${enc(cid)}/equipos/${enc(teamId)}/clave`, { cuerpo: {}, porDefecto: 'No se pudo generar la clave.' });

export const agregarMiembro = (user, cid, teamId, userId) =>
  pedir(user, `competencias/${enc(cid)}/equipos/${enc(teamId)}/miembros`, { cuerpo: { userId }, porDefecto: 'No se pudo agregar al estudiante.' });

export const quitarMiembro = (user, cid, teamId, userId) =>
  pedir(user, `competencias/${enc(cid)}/equipos/${enc(teamId)}/miembros/${enc(userId)}`, { metodo: 'DELETE', porDefecto: 'No se pudo quitar al estudiante.' });

export const buscarEstudiantes = (user, q) =>
  pedir(user, `estudiantes?q=${enc(q)}`, { porDefecto: 'No se pudo buscar.' });

export const buscarBanco = (user, q) =>
  pedir(user, `banco?q=${enc(q)}`, { porDefecto: 'No se pudo buscar en el banco.' });

export const agregarDelBanco = (user, cid, numero, letra) =>
  pedir(user, `competencias/${enc(cid)}/problemas/banco`, { cuerpo: { numero, letra }, porDefecto: 'No se pudo agregar el problema.' });

export const subirPaquete = (user, cid, archivo, letra) => {
  const formulario = new FormData();
  formulario.append('letra', letra);
  formulario.append('zip', archivo);
  return pedir(user, `competencias/${enc(cid)}/problemas/zip`, { formulario, porDefecto: 'No se pudo subir el paquete.' });
};

export const quitarProblema = (user, cid, djId) =>
  pedir(user, `competencias/${enc(cid)}/problemas/${enc(djId)}`, { metodo: 'DELETE', porDefecto: 'No se pudo quitar el problema.' });

export const liberarProblemas = (user, cid) =>
  pedir(user, `competencias/${enc(cid)}/liberar`, { cuerpo: {}, porDefecto: 'No se pudieron liberar los problemas.' });

// ── Durante la competencia ──

export const getEnviosJurado = (user, cid) =>
  pedir(user, `competencias/${enc(cid)}/envios`, { porDefecto: 'No se pudieron cargar los envíos.' });

export const getCodigoEnvio = (user, cid, id) =>
  pedir(user, `competencias/${enc(cid)}/envios/${enc(id)}/codigo`, { porDefecto: 'No se pudo abrir el código.' });

export const getAclaracionesJurado = (user, cid) =>
  pedir(user, `competencias/${enc(cid)}/aclaraciones`, { porDefecto: 'No se pudieron cargar las aclaraciones.' });

/** `{ texto, equipo (teamId o null = todos), responderA (id o null) }`. */
export const responderAclaracion = (user, cid, datos) =>
  pedir(user, `competencias/${enc(cid)}/aclaraciones`, { cuerpo: datos, porDefecto: 'No se pudo enviar.' });

export const getGlobos = (user, cid) =>
  pedir(user, `competencias/${enc(cid)}/globos`, { porDefecto: 'No se pudieron cargar los globos.' });

export const marcarGlobo = (user, cid, id) =>
  pedir(user, `competencias/${enc(cid)}/globos/${enc(id)}`, { cuerpo: {}, porDefecto: 'No se pudo marcar el globo.' });

export const getMarcadorJurado = (user, cid) =>
  pedir(user, `competencias/${enc(cid)}/marcador`, { porDefecto: 'No se pudo cargar el marcador.' });

export const descongelarMarcador = (user, cid) =>
  pedir(user, `competencias/${enc(cid)}/descongelar`, { cuerpo: {}, porDefecto: 'No se pudo descongelar.' });
