// api.codecomp.online -> Edge Function `api` de Supabase. Reenvía método, cabeceras
// (Origin, Authorization, Cookie) y cuerpo tal cual, y devuelve la respuesta con su Set-Cookie.
// Así la app (codecomp.online) y la API comparten sitio y la cookie es de primera parte.

// La funcion se ejecuta junto a la base y al juez (us-east-1): sin esto Supabase la corre en la
// region mas cercana al usuario (sa-east-1 desde Colombia) y cada consulta cruza el continente.
const REGION = 'us-east-1';

export default {
  async fetch(request, env) {
    const entrada = new URL(request.url);
    const destino = `${env.DESTINO.replace(/\/$/, '')}${entrada.pathname}${entrada.search}`;
    const salida = new Request(destino, request);
    salida.headers.set('x-region', REGION);
    return fetch(salida);
  },
};
