// Correo de avisos con Resend: arma los mensajes, firma el enlace de baja y envia lo pendiente.
// Solo lo llama el cron, que es el unico que envia: asi no hay dos envios del mismo aviso.

import type { Config } from './config.ts';
import { dia } from './config.ts';
import type { Sql } from './db.ts';
import { revisarPresupuesto } from './limites.ts';
import { huellaCorta } from './notificaciones.ts';

export interface Pendiente {
  id: string;
  tipo: string;
  datos: Record<string, unknown>;
  email: string;
  userId: string;
}

export interface Mensaje {
  to: string;
  subject: string;
  text: string;
  html: string;
  headers: Record<string, string>;
}

const MAX_INTENTOS = 3;
const LOTE = 50;
// Orden de envio cuando no cabe todo en el cupo del dia.
const PRIORIDAD = ['docente', 'competencia_1d', 'cierre_1d', 'resumen_semanal'];

/* ── Enlace de baja: id del usuario firmado con HMAC, sin sesion ── */

const b64url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const firma = async (clave: string, texto: string): Promise<string> => {
  const llave = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(clave),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  return b64url(new Uint8Array(await crypto.subtle.sign('HMAC', llave, new TextEncoder().encode(texto))));
};

/** Comparacion en tiempo constante (claves y firmas). */
export const iguales = (a: string, b: string): boolean => {
  if (a.length !== b.length) return false;
  let diferencia = 0;
  for (let i = 0; i < a.length; i++) diferencia |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diferencia === 0;
};

export const tokenDeBaja = async (clave: string, userId: string) =>
  `${userId}.${await firma(clave, `baja:${userId}`)}`;

/** Devuelve el usuario del enlace de baja si la firma es valida. */
export const usuarioDeBaja = async (clave: string, token: string | null): Promise<string | null> => {
  if (!clave || !token) return null;
  const [userId, recibida] = token.split('.');
  if (!userId || !recibida || !/^[0-9a-f-]{36}$/i.test(userId)) return null;
  return iguales(recibida, await firma(clave, `baja:${userId}`)) ? userId : null;
};

/* ── Mensajes (textos borrador: los decide el equipo) ── */

export const escaparHtml = (texto: string) =>
  texto.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

const unaLinea = (texto: string) => texto.replace(/\s+/g, ' ').trim().slice(0, 150);

const fechaBogota = (iso: string, zona: string) =>
  new Date(iso).toLocaleString('es-CO', { timeZone: zona, dateStyle: 'full', timeStyle: 'short' });

const contenido = (p: Pendiente, config: Config): { asunto: string; parrafos: string[]; enlace: string } | null => {
  const d = p.datos;
  switch (p.tipo) {
    case 'docente':
      return {
        asunto: `${d.clase}: ${d.titulo}`,
        parrafos: [`Tu docente de ${d.clase} escribió:`, String(d.titulo), String(d.texto)],
        enlace: `${config.appUrl}/dashboard`,
      };
    case 'competencia_1d':
      return {
        asunto: `Mañana empieza ${d.competencia}`,
        parrafos: [
          `La competencia ${d.competencia} empieza el ${fechaBogota(String(d.inicio), config.zonaHoraria)}.`,
          'Entra unos minutos antes para revisar tu equipo.',
        ],
        enlace: `${config.appUrl}/dashboard/competencias`,
      };
    case 'cierre_1d': {
      const problemas = (d.problemas as { numero: number; titulo: string }[]) ?? [];
      return {
        asunto: problemas.length === 1
          ? `Mañana se cierra el problema #${problemas[0].numero}`
          : `Mañana se cierran ${problemas.length} problemas que intentaste`,
        parrafos: [
          'Si no los resuelves hoy, contarán como no resueltos en tu nivel:',
          ...problemas.map((x) => `#${x.numero} ${x.titulo}`),
        ],
        enlace: `${config.appUrl}/dashboard/problemas`,
      };
    }
    case 'resumen_semanal': {
      const clases = (d.clases as { nombre: string; alertas: number; nuevos: number; activos: number }[]) ?? [];
      return {
        asunto: 'Resumen semanal de tus clases',
        parrafos: [
          'Así les fue a tus clases la semana pasada:',
          ...clases.map((c) =>
            `${c.nombre}: ${c.activos} resolvieron algo, ${c.alertas} con alertas, ${c.nuevos} nuevos.`
          ),
          'Los detalles están en el panel docente.',
        ],
        enlace: `${config.appUrl}/historial-usuarios`,
      };
    }
    default:
      return null;
  }
};

export const mensajeDe = async (p: Pendiente, config: Config): Promise<Mensaje | null> => {
  const c = contenido(p, config);
  if (!c) return null;
  const baja = `${config.apiUrl}/correo/baja?t=${encodeURIComponent(await tokenDeBaja(config.correoFirmaClave, p.userId))}`;
  const pie = 'Recibes este correo porque tienes activados los avisos por correo en CODECOMP.';
  return {
    to: p.email,
    subject: unaLinea(c.asunto),
    text: [...c.parrafos, '', c.enlace, '', pie, `Dejar de recibir correos: ${baja}`].join('\n'),
    html: `<div style="font-family:Arial,sans-serif;max-width:560px;border:2px solid #000;padding:20px">
<p style="font-weight:700;color:#0736FE;letter-spacing:.1em;font-size:12px">CODECOMP</p>
${c.parrafos.map((x) => `<p style="font-size:15px;line-height:1.5;white-space:pre-line">${escaparHtml(x)}</p>`).join('\n')}
<p><a href="${escaparHtml(c.enlace)}" style="display:inline-block;background:#0736FE;color:#fff;padding:10px 16px;border:2px solid #000;text-decoration:none;font-weight:700">Abrir CODECOMP</a></p>
<p style="font-size:12px;color:#5A6070">${pie} <a href="${escaparHtml(baja)}">Dejar de recibir correos</a>.</p>
</div>`,
    headers: {
      'List-Unsubscribe': `<${baja}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    },
  };
};

/* ── Envio ── */

export type Enviador = (mensajes: Mensaje[], llaveIdempotencia: string) => Promise<boolean>;

/** API batch de Resend (hasta 100 por llamada). Todo o nada. */
export const enviadorResend = (config: Config): Enviador => async (mensajes, llaveIdempotencia) => {
  const res = await fetch('https://api.resend.com/emails/batch', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.resendApiKey}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': llaveIdempotencia,
    },
    body: JSON.stringify(mensajes.map((m) => ({ from: config.correoRemitente, ...m }))),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) console.error('Resend rechazo el lote:', res.status, (await res.text()).slice(0, 300));
  return res.ok;
};

/**
 * Envia los correos pendientes dentro del cupo. Reclama las filas en una sola sentencia
 * (estado `enviando`) y llama a Resend fuera de cualquier transaccion.
 */
export const enviarPendientes = async (
  sql: Sql,
  config: Config,
  enviar: Enviador = enviadorResend(config),
  ahora = new Date(),
): Promise<{ enviados: number; omitidos: number }> => {
  if (!config.resendApiKey || !config.correoFirmaClave) return { enviados: 0, omitidos: 0 };
  const hoy = dia(config.zonaHoraria, ahora);

  // Lo que quedo a medias hace mas de 10 minutos vuelve a la cola.
  await sql`
    UPDATE notificaciones SET correo = 'pendiente'
    WHERE correo = 'enviando' AND correo_reclamado_en < now() - INTERVAL '10 minutes'
  `;
  // Sin permiso, sin verificar, de prueba o vencido: no se envia.
  const omitidos = await sql`
    UPDATE notificaciones n SET correo = 'omitido'
    FROM users u
    WHERE n.user_id = u.id AND n.correo = 'pendiente' AND (
      NOT u.avisos_correo OR NOT u.correo_verificado OR u.email IS NULL
      OR u.email ILIKE '%@firebase.local' OR u.email ILIKE '%@codecomp.test'
      OR (n.tipo = 'competencia_1d' AND (n.datos->>'inicio')::timestamptz <= now())
      OR (n.tipo = 'cierre_1d' AND n.datos->>'fecha' IS DISTINCT FROM ${hoy})
      OR (n.tipo = 'docente' AND n.creada_en < now() - INTERVAL '3 days')
      OR (n.tipo = 'resumen_semanal' AND n.creada_en < now() - INTERVAL '7 days')
    )
    RETURNING n.id
  `;

  const reclamadas = await sql`
    UPDATE notificaciones n SET correo = 'enviando', correo_intentos = n.correo_intentos + 1,
      correo_reclamado_en = now()
    FROM users u
    WHERE n.user_id = u.id AND n.id IN (
      SELECT id FROM notificaciones WHERE correo = 'pendiente'
      ORDER BY array_position(${PRIORIDAD}::text[], tipo), creada_en
      LIMIT ${LOTE} FOR UPDATE SKIP LOCKED
    )
    RETURNING n.id, n.tipo, n.datos, n.correo_intentos, n.user_id, u.email
  `;
  if (!reclamadas.length) return { enviados: 0, omitidos: omitidos.length };

  const ordenadas = [...reclamadas].sort((a, b) =>
    PRIORIDAD.indexOf(a.tipo as string) - PRIORIDAD.indexOf(b.tipo as string)
  );
  // Cupo global: si no se puede revisar, se corta y todo vuelve a la cola.
  const enviables: typeof ordenadas = [];
  for (const fila of ordenadas) {
    let permiso;
    try {
      permiso = await revisarPresupuesto(
        sql,
        `correo:${hoy}`,
        `correo:${hoy.slice(0, 7)}`,
        config.correoMaxDiario,
        config.correoMaxMensual,
      );
    } catch (error) {
      console.error('Fallo al revisar el cupo de correo:', error);
      break;
    }
    if (!permiso.permitido) break;
    enviables.push(fila);
  }
  const devolver = ordenadas.filter((f) => !enviables.includes(f)).map((f) => f.id as string);
  if (devolver.length) {
    await sql`
      UPDATE notificaciones SET correo = 'pendiente', correo_intentos = correo_intentos - 1
      WHERE id = ANY(${devolver}::uuid[])
    `;
  }

  const mensajes: { id: string; intentos: number; mensaje: Mensaje }[] = [];
  const sinMensaje: string[] = [];
  for (const f of enviables) {
    const mensaje = await mensajeDe({
      id: f.id as string,
      tipo: f.tipo as string,
      datos: f.datos as Record<string, unknown>,
      email: f.email as string,
      userId: f.user_id as string,
    }, config);
    if (mensaje) mensajes.push({ id: f.id as string, intentos: f.correo_intentos as number, mensaje });
    else sinMensaje.push(f.id as string);
  }
  if (sinMensaje.length) {
    await sql`UPDATE notificaciones SET correo = 'omitido' WHERE id = ANY(${sinMensaje}::uuid[])`;
  }
  if (!mensajes.length) return { enviados: 0, omitidos: omitidos.length + sinMensaje.length };

  const ids = mensajes.map((m) => m.id);
  let ok = false;
  try {
    ok = await enviar(mensajes.map((m) => m.mensaje), `avisos-${await huellaCorta([...ids].sort().join('.'))}`);
  } catch (error) {
    console.error('No se pudo enviar el lote de correo:', error);
  }
  if (ok) {
    await sql`
      UPDATE notificaciones SET correo = 'enviado', correo_enviado_en = now() WHERE id = ANY(${ids}::uuid[])
    `;
    return { enviados: ids.length, omitidos: omitidos.length + sinMensaje.length };
  }
  await sql`
    UPDATE notificaciones
    SET correo = CASE WHEN correo_intentos >= ${MAX_INTENTOS} THEN 'fallido' ELSE 'pendiente' END
    WHERE id = ANY(${ids}::uuid[])
  `;
  return { enviados: 0, omitidos: omitidos.length + sinMensaje.length };
};
