// POST /sesion: con el token de Firebase emite la cookie cifrada de actividad.
// DELETE /sesion: la borra (al cerrar sesion).

import type { Contexto } from '../contexto.ts';
import { rechazo, responder } from '../http.ts';
import { borrarCookie, llaveDe, sellar, setCookie } from '../sesion.ts';

export const sesion = async (ctx: Contexto): Promise<Response> => {
  const { req, config, cors, identidad } = ctx;

  if (req.method === 'DELETE') {
    const respuesta = responder({ status: 200, cuerpo: { ok: true } }, cors);
    respuesta.headers.append('Set-Cookie', borrarCookie());
    return respuesta;
  }
  if (req.method !== 'POST') return responder(rechazo(405, 'metodo', 'Metodo no permitido.'), cors);
  if (!identidad) {
    return responder(rechazo(401, 'sin-sesion', 'Inicia sesion para continuar.'), cors);
  }
  const llave = await llaveDe(config.sesionLlave);
  if (!llave) {
    return responder(rechazo(503, 'sin-cookie', 'La sesion por cookie no esta configurada.'), cors);
  }
  const respuesta = responder({ status: 200, cuerpo: { ok: true } }, cors);
  respuesta.headers.append('Set-Cookie', setCookie(await sellar(identidad, llave)));
  return respuesta;
};
