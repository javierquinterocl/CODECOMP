// api.codecomp.online -> Edge Function `api` de Supabase. Reenvía método, cabeceras
// (Origin, Authorization, Cookie) y cuerpo tal cual, y devuelve la respuesta con su Set-Cookie.
// Así la app (codecomp.online) y la API comparten sitio y la cookie es de primera parte.

// La funcion se ejecuta junto a la base y al juez (us-east-1): sin esto Supabase la corre en la
// region mas cercana al usuario (sa-east-1 desde Colombia) y cada consulta cruza el continente.
const REGION = 'us-east-1';

export default {
  async fetch(request, env) {
    const entrada = new URL(request.url);
    // El cron de avisos solo lo dispara este Worker, nunca una peticion de afuera.
    if (entrada.pathname.startsWith('/cron')) return new Response('No encontrado', { status: 404 });
    const destino = `${env.DESTINO.replace(/\/$/, '')}${entrada.pathname}${entrada.search}`;
    const salida = new Request(destino, request);
    salida.headers.set('x-region', REGION);
    return fetch(salida);
  },

  // Cada 5 minutos (wrangler.toml): recordatorios, resumenes y correos pendientes.
  async scheduled(_evento, env, ctx) {
    if (!env.CRON_CLAVE) return;
    ctx.waitUntil(
      fetch(`${env.DESTINO.replace(/\/$/, '')}/cron/avisos`, {
        method: 'POST',
        headers: { 'x-cron-clave': env.CRON_CLAVE.trim(), 'x-region': REGION },
      }).then((r) => {
        if (!r.ok) console.error('Cron de avisos respondio', r.status);
      }),
    );
  },
};
