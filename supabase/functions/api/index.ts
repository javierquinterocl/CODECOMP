

import { cargarConfig } from '../_compartido/config.ts';
import { cabecerasCors, rechazo, responder, tokenDe } from '../_compartido/http.ts';
import { conexion } from '../_compartido/db.ts';
import { segmentosDe } from '../_compartido/enrutado.ts';
import { identidadDelToken } from '../_compartido/auth.ts';
import type { Contexto } from '../_compartido/contexto.ts';
import { judge0 } from '../_compartido/rutas/judge0.ts';
import { adaptativo } from '../_compartido/rutas/adaptativo.ts';
import { detalleProblema, listarProblemas } from '../_compartido/rutas/problemas.ts';
import { progreso, recomendaciones, sincronizarUsuario } from '../_compartido/rutas/progreso.ts';

Deno.serve(async (req: Request) => {
  const config = cargarConfig();
  const url = new URL(req.url);
  const origen = req.headers.get('origin');

  const cors = cabecerasCors(origen, config.origenesPermitidos);
  if (!cors) {
    return responder(rechazo(403, 'origen', 'Origen no permitido.'));
  }

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors });
  }

  const segmentos = segmentosDe(url.pathname);
  const ruta = segmentos[0] ?? '';

  if (ruta === 'salud') {
    return responder(
      { status: 200, cuerpo: { ok: true, modo: config.modo, hayBase: Boolean(config.databaseUrl) } },
      cors,
    );
  }

  let sql;
  try {
    sql = conexion(config.databaseUrl);
  } catch (error) {
    console.error('Sin conexion a Postgres:', error);
    return responder(rechazo(503, 'sin-base', 'El servicio no esta configurado.'), cors);
  }

  // Se verifica una vez; cada ruta decide si lo exige.
  const identidad = await identidadDelToken(tokenDe(req), config.firebaseProjectId);
  const ctx: Contexto = { req, url, sql, config, cors, identidad };

  try {
    switch (ruta) {
      case 'judge0':
        return await judge0(ctx);
      case 'adaptive':
        return await adaptativo(ctx);
      case 'sync-user':
        return await sincronizarUsuario(ctx);
      case 'recommendations':
        return await recomendaciones(ctx);
      case 'progress':
        return await progreso(ctx);
      case 'problems':
        return segmentos[1]
          ? await detalleProblema(ctx, Number(segmentos[1]))
          : await listarProblemas(ctx);
      default:
        return responder(rechazo(404, 'ruta', 'Ruta no encontrada.'), cors);
    }
  } catch (error) {
    console.error('Error no controlado:', error);
    return responder(rechazo(500, 'interno', 'Error interno.'), cors);
  }
});
