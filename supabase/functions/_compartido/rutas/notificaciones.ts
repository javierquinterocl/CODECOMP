// GET /notificaciones: avisos de la campana guardados en la cuenta. Los que se calculan con datos
// que ya existen (racha, cierre, alertas, nuevos) se guardan al leer, con una clave estable.
// POST /notificaciones/leidas { ids } | { todas: true }: marca leidos.
// El texto de cada aviso lo arma el frontend con su tipo y sus datos.

import type { Contexto } from '../contexto.ts';
import type { Sql } from '../db.ts';
import { esDocente, type Identidad } from '../auth.ts';
import { type Config, dia } from '../config.ts';
import { DIAS_PARA_CERRAR } from '../nivel.ts';
import { rachaDelUsuario } from '../racha.ts';
import { rechazo, responder } from '../http.ts';
import { idDeUsuario } from '../usuarios.ts';
import { estudiantesDeClase } from './docente.ts';
import { type NuevaNotificacion, notificar, semanaIso, TIPOS_CONOCIDOS } from '../notificaciones.ts';

const MS_DIA = 86_400_000;
// En la campana se avisa con 3 y 2 dias restantes; el ultimo dia lo avisa el cron (cierre_1d).
export const AVISAR_CIERRE_DIAS = 3;
const MAX_LISTA = 30;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Problemas con fallos, sin aceptar y aun abiertos para el nivel, con los dias que les quedan. */
export const problemasPorCerrar = async (sql: Sql, userId: string) => {
  const abiertos = await sql`
    SELECT p.problem_number AS numero, p.title AS titulo, p.title_es AS titulo_es,
      min(s.created_at) AS primer_fallo
    FROM submissions s JOIN problems p ON p.id = s.problem_id
    WHERE s.user_id = ${userId}
      AND s.verdict IN ('WRONG_ANSWER', 'RUNTIME_ERROR', 'TIME_LIMIT_EXCEEDED')
      AND NOT EXISTS (SELECT 1 FROM submissions a WHERE a.user_id = ${userId}
        AND a.problem_id = p.id AND a.verdict = 'ACCEPTED')
      AND NOT EXISTS (SELECT 1 FROM resultados_problema r
        WHERE r.user_id = ${userId} AND r.problem_id = p.id)
    GROUP BY p.id
  `;
  return abiertos.map((p) => ({
    numero: p.numero as number,
    titulo: (p.titulo_es || p.titulo) as string,
    quedan: Math.ceil(DIAS_PARA_CERRAR - (Date.now() - (p.primer_fallo as Date).getTime()) / MS_DIA),
  }));
};

// Guarda los avisos calculados y retira los que ya no aplican y nadie leyo.
const materializar = async (
  sql: Sql,
  config: Config,
  identidad: Identidad,
  userId: string,
) => {
  const hoy = dia(config.zonaHoraria);
  const filas: NuevaNotificacion[] = [];
  const agregar = (tipo: string, clave: string, datos: Record<string, unknown>) => {
    filas.push({ userId, tipo, clave, datos });
  };

  if (esDocente(identidad, config.docentes)) {
    const clases = await sql`SELECT id, nombre FROM clases WHERE docente_id = ${userId}`;
    for (const clase of clases) {
      const estudiantes = await estudiantesDeClase(sql, clase.id as string);
      const conAlertas = estudiantes.filter((e) => e.alertas.length).length;
      if (conAlertas) {
        agregar('alertas', `alertas-${clase.id}-${hoy}`, { cantidad: conAlertas, clase: clase.nombre });
      }
      const nuevos = estudiantes.filter((e) => Date.now() - e.unidoEn.getTime() < 7 * MS_DIA).length;
      if (nuevos) {
        agregar('nuevos', `nuevos-${clase.id}-${semanaIso(hoy)}`, { cantidad: nuevos, clase: clase.nombre });
      }
    }
  } else {
    const { racha, envioHoy } = await rachaDelUsuario(sql, userId, config.zonaHoraria);
    if (racha > 0 && !envioHoy) agregar('racha', `racha-${hoy}`, { racha });
    for (const p of await problemasPorCerrar(sql, userId)) {
      if (p.quedan > 1 && p.quedan <= AVISAR_CIERRE_DIAS) {
        agregar('cierre', `cierre-${p.numero}`, p);
      }
    }
  }

  await notificar(sql, filas);
  // Un aviso calculado que dejo de aplicar (ya envio hoy, ya resolvio) se retira si no se leyo.
  await sql`
    DELETE FROM notificaciones
    WHERE user_id = ${userId} AND leida_en IS NULL
      AND tipo = ANY(${['racha', 'cierre', 'alertas', 'nuevos']}::text[])
      AND NOT (clave = ANY(${filas.map((f) => f.clave)}::text[]))
  `;
};

const listar = async (sql: Sql, userId: string) => {
  const filas = await sql`
    SELECT id, tipo, datos, creada_en, leida_en IS NOT NULL AS leida
    FROM notificaciones
    WHERE user_id = ${userId} AND tipo = ANY(${TIPOS_CONOCIDOS}::text[])
    ORDER BY creada_en DESC LIMIT ${MAX_LISTA}
  `;
  const [{ sin_leer }] = await sql`
    SELECT count(*)::int AS sin_leer FROM notificaciones
    WHERE user_id = ${userId} AND leida_en IS NULL AND tipo = ANY(${TIPOS_CONOCIDOS}::text[])
  `;
  return { notificaciones: filas, sin_leer };
};

const marcarLeidas = async (ctx: Contexto, userId: string) => {
  const { req, sql, cors } = ctx;
  const cuerpo = await req.json().catch(() => null);
  if (cuerpo?.todas === true) {
    await sql`UPDATE notificaciones SET leida_en = now() WHERE user_id = ${userId} AND leida_en IS NULL`;
  } else {
    const ids = Array.isArray(cuerpo?.ids) ? cuerpo.ids : null;
    if (!ids || !ids.length || ids.length > 100 || !ids.every((i: unknown) => typeof i === 'string' && UUID.test(i))) {
      return responder(rechazo(400, 'datos', 'Envia ids validos o todas: true.'), cors);
    }
    await sql`
      UPDATE notificaciones SET leida_en = now()
      WHERE user_id = ${userId} AND leida_en IS NULL AND id = ANY(${ids}::uuid[])
    `;
  }
  return responder({ status: 200, cuerpo: await listar(sql, userId) }, cors);
};

export const notificaciones = async (ctx: Contexto, recurso?: string): Promise<Response> => {
  const { req, sql, config, cors, identidad } = ctx;
  if (!identidad) {
    return responder(rechazo(401, 'sin-sesion', 'Inicia sesion para ver tus avisos.'), cors);
  }
  const lectura = !recurso && req.method === 'GET';
  const leidas = recurso === 'leidas' && req.method === 'POST';
  if (!lectura && !leidas) return responder(rechazo(405, 'metodo', 'Metodo no permitido.'), cors);

  try {
    const userId = await idDeUsuario(sql, identidad);
    if (leidas) return await marcarLeidas(ctx, userId);
    // Si no se pueden calcular los avisos, la campana muestra los que ya estaban guardados.
    await materializar(sql, config, identidad, userId).catch((error) =>
      console.error('No se pudieron calcular los avisos:', error)
    );
    return responder({ status: 200, cuerpo: await listar(sql, userId) }, cors);
  } catch (error) {
    console.error('Notificaciones error:', error);
    return responder(rechazo(500, 'consulta', 'No se pudieron cargar tus avisos.'), cors);
  }
};
