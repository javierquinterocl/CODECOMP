// POST /cron/avisos: lo llama el Worker de Cloudflare cada 5 minutos con la cabecera x-cron-clave.
// Crea los recordatorios de competencia, el cierre de problemas a 1 dia y el resumen semanal del
// docente, envia los correos pendientes y purga lo viejo. Todo es idempotente por la clave.
// GET y POST /correo/baja?t=...: deja de enviar correos a quien abre el enlace firmado.

import type { Config } from '../config.ts';
import type { Sql } from '../db.ts';
import { type Enviador, enviarPendientes, iguales, usuarioDeBaja } from '../correo.ts';
import { DIAS_PARA_CERRAR } from '../nivel.ts';
import {
  type NuevaNotificacion,
  notificar,
  recordatorioDe,
  relojEn,
  retirarRecordatorios,
  semanaIso,
} from '../notificaciones.ts';
import { estudiantesDeClase } from './docente.ts';

const HORA_AVISOS = 7;
const MAX_PROBLEMAS_CIERRE = 5;

const json = (status: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), { status, headers: { 'Content-Type': 'application/json' } });

export const recordatoriosDeCompetencias = async (sql: Sql, ahora: Date) => {
  const filas = await sql`
    SELECT c.cid, c.nombre, c.inicio, m.user_id
    FROM competencias c
    JOIN competencia_equipos e ON e.cid = c.cid AND NOT e.retirado
    JOIN competencia_miembros m ON m.team_id = e.team_id AND m.cid = c.cid
    WHERE NOT c.archivada AND c.inicio > ${ahora} AND c.inicio <= ${ahora}::timestamptz + INTERVAL '24 hours'
  `;
  const avisos: NuevaNotificacion[] = [];
  const cids = new Map<string, Date>();
  for (const f of filas) {
    const inicio = f.inicio as Date;
    const cual = recordatorioDe(inicio, ahora);
    if (!cual) continue;
    cids.set(f.cid as string, inicio);
    avisos.push({
      userId: f.user_id as string,
      tipo: `competencia_${cual}`,
      clave: `competencia-${cual}-${f.cid}-${inicio.getTime()}`,
      datos: { cid: f.cid, competencia: f.nombre, inicio: inicio.toISOString() },
    });
  }
  // Si la hora cambio desde DOMjudge, lo de la hora anterior sin leer se retira.
  for (const [cid, inicio] of cids) await retirarRecordatorios(sql, cid, inicio);
  return notificar(sql, avisos);
};

export const cierresDeManana = async (sql: Sql, fecha: string) => {
  // Le queda 1 dia: el primer fallo fue hace entre DIAS-1 y DIAS dias (como en la campana).
  const filas = await sql`
    SELECT s.user_id, p.problem_number AS numero, coalesce(p.title_es, p.title) AS titulo
    FROM submissions s JOIN problems p ON p.id = s.problem_id
    WHERE s.verdict IN ('WRONG_ANSWER', 'RUNTIME_ERROR', 'TIME_LIMIT_EXCEEDED')
      AND s.created_at > now() - make_interval(days => ${DIAS_PARA_CERRAR})
      AND NOT EXISTS (SELECT 1 FROM submissions a WHERE a.user_id = s.user_id
        AND a.problem_id = s.problem_id AND a.verdict = 'ACCEPTED')
      AND NOT EXISTS (SELECT 1 FROM resultados_problema r
        WHERE r.user_id = s.user_id AND r.problem_id = s.problem_id)
    GROUP BY s.user_id, p.id
    HAVING min(s.created_at) <= now() - make_interval(days => ${DIAS_PARA_CERRAR - 1})
    ORDER BY s.user_id, p.problem_number
  `;
  const porUsuario = new Map<string, { numero: number; titulo: string }[]>();
  for (const f of filas) {
    const lista = porUsuario.get(f.user_id as string) ?? [];
    if (lista.length < MAX_PROBLEMAS_CIERRE) lista.push({ numero: f.numero as number, titulo: f.titulo as string });
    porUsuario.set(f.user_id as string, lista);
  }
  return notificar(sql, [...porUsuario].map(([userId, problemas]) => ({
    userId,
    tipo: 'cierre_1d',
    clave: `cierre_1d-${fecha}`,
    datos: { fecha, problemas },
  })));
};

export const resumenesSemanales = async (sql: Sql, config: Config, fecha: string) => {
  const semana = semanaIso(fecha);
  const docentes = await sql`
    SELECT DISTINCT u.id FROM users u JOIN clases c ON c.docente_id = u.id
    WHERE lower(u.email) = ANY(${[...config.docentes]}::text[])
      AND NOT EXISTS (SELECT 1 FROM notificaciones n WHERE n.user_id = u.id AND n.clave = ${`resumen-${semana}`})
  `;
  const avisos: NuevaNotificacion[] = [];
  for (const d of docentes) {
    const clases = await sql`SELECT id, nombre FROM clases WHERE docente_id = ${d.id} ORDER BY creado_en`;
    const resumen = [];
    for (const c of clases) {
      const estudiantes = await estudiantesDeClase(sql, c.id as string);
      // Solo conteos: el correo no lleva nombres de estudiantes.
      const [{ activos }] = await sql`
        SELECT count(DISTINCT m.user_id)::int AS activos FROM clase_miembros m
        WHERE m.clase_id = ${c.id} AND (
          EXISTS (SELECT 1 FROM submissions s WHERE s.user_id = m.user_id AND s.verdict = 'ACCEPTED'
            AND s.created_at > now() - INTERVAL '7 days')
          OR EXISTS (SELECT 1 FROM fundamentos_envios f WHERE f.user_id = m.user_id
            AND f.veredicto = 'ACEPTADO' AND f.creado_en > now() - INTERVAL '7 days'))
      `;
      resumen.push({
        nombre: c.nombre,
        alertas: estudiantes.filter((e) => e.alertas.length).length,
        nuevos: estudiantes.filter((e) => Date.now() - e.unidoEn.getTime() < 7 * 86_400_000).length,
        activos,
      });
    }
    if (resumen.length) {
      avisos.push({ userId: d.id as string, tipo: 'resumen_semanal', clave: `resumen-${semana}`, datos: { semana, clases: resumen } });
    }
  }
  return notificar(sql, avisos);
};

const purgar = (sql: Sql) =>
  sql`
    DELETE FROM notificaciones
    WHERE (leida_en IS NOT NULL AND creada_en < now() - INTERVAL '90 days')
      OR creada_en < now() - INTERVAL '180 days'
  `;

export const cronAvisos = async (
  req: Request,
  sql: Sql,
  config: Config,
  opciones: { ahora?: Date; enviar?: Enviador } = {},
): Promise<Response> => {
  if (req.method !== 'POST') return json(405, { codigo: 'metodo' });
  const clave = req.headers.get('x-cron-clave') ?? '';
  if (!config.cronClave || !iguales(clave, config.cronClave)) return json(401, { codigo: 'clave' });

  const ahora = opciones.ahora ?? new Date();
  const reloj = relojEn(config.zonaHoraria, ahora);
  const hecho: Record<string, unknown> = {};
  // Cada tarea por separado: si una falla, las demas siguen.
  const tarea = async (nombre: string, fn: () => Promise<unknown>) => {
    try {
      hecho[nombre] = await fn();
    } catch (error) {
      console.error(`Cron ${nombre} fallo:`, error);
      hecho[nombre] = 'error';
    }
  };
  await tarea('competencias', () => recordatoriosDeCompetencias(sql, ahora));
  if (reloj.hora >= HORA_AVISOS) {
    await tarea('cierres', () => cierresDeManana(sql, reloj.fecha));
    if (reloj.diaSemana === 1) await tarea('resumenes', () => resumenesSemanales(sql, config, reloj.fecha));
  }
  await tarea('correo', () => enviarPendientes(sql, config, opciones.enviar, ahora));
  await tarea('purga', async () => (await purgar(sql)).count);
  return json(200, hecho);
};

const pagina = (titulo: string, cuerpo: string, status = 200) =>
  new Response(
    `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${titulo}</title></head>
<body style="font-family:Arial,sans-serif;max-width:520px;margin:40px auto;padding:0 16px">
<div style="border:2px solid #000;box-shadow:4px 4px 0 #000;padding:24px"><h1 style="font-size:20px">${titulo}</h1>${cuerpo}</div></body></html>`,
    { status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } },
  );

/** GET muestra un boton (los filtros de correo abren los enlaces solos); POST da de baja. */
export const correoBaja = async (req: Request, url: URL, sql: Sql, config: Config): Promise<Response> => {
  const token = url.searchParams.get('t');
  const userId = await usuarioDeBaja(config.correoFirmaClave, token);
  if (!userId) return pagina('Enlace no valido', '<p>Este enlace no es valido o ya no funciona.</p>', 400);
  if (req.method === 'POST') {
    await sql`UPDATE users SET avisos_correo = false WHERE id = ${userId}`;
    return pagina(
      'Listo',
      `<p>Ya no recibirás avisos por correo. Puedes volver a activarlos en Mi cuenta.</p><p><a href="${config.appUrl}/dashboard/cuenta">Ir a CODECOMP</a></p>`,
    );
  }
  if (req.method !== 'GET') return pagina('Método no permitido', '', 405);
  return pagina(
    'Dejar de recibir correos',
    `<p>¿Quieres dejar de recibir los avisos de CODECOMP por correo? En la campana los seguirás viendo.</p>
<form method="post"><button type="submit" style="background:#0736FE;color:#fff;border:2px solid #000;padding:10px 16px;font-weight:700;cursor:pointer">Dejar de recibir correos</button></form>`,
  );
};
