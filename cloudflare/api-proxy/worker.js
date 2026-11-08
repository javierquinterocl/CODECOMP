// api.codecomp.online -> Edge Function `api` de Supabase. Reenvía método, cabeceras
// (Origin, Authorization, Cookie) y cuerpo tal cual, y devuelve la respuesta con su Set-Cookie.
// Así la app (codecomp.online) y la API comparten sitio y la cookie es de primera parte.

export default {
  async fetch(request, env) {
    const entrada = new URL(request.url);
    const destino = `${env.DESTINO.replace(/\/$/, '')}${entrada.pathname}${entrada.search}`;
    return fetch(new Request(destino, request));
  },
};
