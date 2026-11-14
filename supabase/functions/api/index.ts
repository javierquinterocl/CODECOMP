

import { cargarConfig } from '../_compartido/config.ts';
import { cabecerasCors, origenConfiable, rechazo, responder, tokenDe } from '../_compartido/http.ts';
import { abrir, cookieDe, llaveDe } from '../_compartido/sesion.ts';
import { sesion } from '../_compartido/rutas/sesion.ts';
import { notificaciones } from '../_compartido/rutas/notificaciones.ts';
import { conexion } from '../_compartido/db.ts';
import { segmentosDe } from '../_compartido/enrutado.ts';
import { identidadDelToken } from '../_compartido/auth.ts';
import type { Contexto } from '../_compartido/contexto.ts';
import { judge0 } from '../_compartido/rutas/judge0.ts';
import { adaptativo } from '../_compartido/rutas/adaptativo.ts';
import { detalleProblema, listarProblemas } from '../_compartido/rutas/problemas.ts';
import { progreso, recomendaciones, sincronizarUsuario } from '../_compartido/rutas/progreso.ts';
import { tutor } from '../_compartido/rutas/tutor.ts';
import { fundamentos } from '../_compartido/rutas/fundamentos.ts';
import { actividad, clases, datos } from '../_compartido/rutas/registro.ts';
import { docente } from '../_compartido/rutas/docente.ts';
import { miProgreso } from '../_compartido/rutas/miProgreso.ts';
import { competencias } from '../_compartido/rutas/competencias.ts';
import { jurado } from '../_compartido/rutas/jurado.ts';
import { correoBaja, cronAvisos } from '../_compartido/rutas/cron.ts';
import { rechazoDeCuenta } from '../_compartido/cuenta.ts';
import { cuenta } from '../_compartido/rutas/cuenta.ts';

Deno.serve(async (req: Request) => {
  const config = cargarConfig();
  const url = new URL(req.url);
  const origen = req.headers.get('origin');

  // El cron (Worker de Cloudflare) y la baja del correo no los llama la app: van sin CORS.
  const primero = segmentosDe(url.pathname)[0];
  if (primero === 'cron' || primero === 'correo') {
    try {
      const sqlDirecto = conexion(config.databaseUrl);
      return primero === 'cron'
        ? await cronAvisos(req, sqlDirecto, config)
        : await correoBaja(req, url, sqlDirecto, config);
    } catch (error) {
      console.error('Error en cron o baja:', error);
      return new Response(JSON.stringify({ codigo: 'interno' }), { status: 500 });
    }
  }

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
  let identidad = await identidadDelToken(tokenDe(req), config.firebaseProjectId);
  // Sin token, la actividad puede llegar con la cookie cifrada (sendBeacon no lleva cabeceras),
  // y solo si viene de un origen de la lista.
  if (!identidad && ruta === 'actividad' && origenConfiable(origen, config.origenesPermitidos)) {
    const llave = await llaveDe(config.sesionLlave);
    const valor = cookieDe(req);
    if (llave && valor) identidad = await abrir(valor, llave);
  }
  if (identidad) {
    const motivo = await rechazoDeCuenta(sql, identidad);
    if (motivo === 'cuenta-eliminada') {
      return responder(rechazo(403, motivo, 'Esta cuenta fue eliminada a peticion tuya.'), cors);
    }
    if (motivo === 'sesion-cerrada') {
      return responder(rechazo(401, motivo, 'Tu sesion se cerro en todos los dispositivos. Vuelve a entrar.'), cors);
    }
  }
  const ctx: Contexto = { req, url, sql, config, cors, identidad };

  try {
    switch (ruta) {
      case 'judge0':
        return await judge0(ctx);
      case 'adaptive':
        return await adaptativo(ctx);
      case 'tutor':
        return await tutor(ctx);
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
      case 'fundamentos':
        return await fundamentos(ctx, segmentos[1]);
      case 'datos':
        return await datos(ctx);
      case 'actividad':
        return await actividad(ctx, segmentos[1]);
      case 'clases':
        return await clases(ctx, segmentos[1]);
      case 'docente':
        return await docente(ctx, segmentos[1], segmentos[2], segmentos[3]);
      case 'mi-progreso':
        return await miProgreso(ctx);
      case 'sesion':
        return await sesion(ctx);
      case 'notificaciones':
        return await notificaciones(ctx, segmentos[1]);
      case 'competencias':
        return await competencias(ctx, segmentos[1], segmentos[2]);
      case 'jurado':
        return await jurado(ctx, segmentos.slice(1));
      case 'cuenta':
        return await cuenta(ctx, segmentos.slice(1));
      default:
        return responder(rechazo(404, 'ruta', 'Ruta no encontrada.'), cors);
    }
  } catch (error) {
    console.error('Error no controlado:', error);
    return responder(rechazo(500, 'interno', 'Error interno.'), cors);
  }
});
