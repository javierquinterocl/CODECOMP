// Correos propios de cuenta: recuperar la contrasena (sin sesion) y verificar el correo (con sesion).
// Firebase solo genera el codigo; el correo sale por Resend con enlace a la pagina /accion.

import type { Contexto } from '../contexto.ts';
import { rechazo, responder } from '../http.ts';
import { dia, mes } from '../config.ts';
import { revisarPresupuesto } from '../limites.ts';
import { enviadorResend, type Enviador, firma, mensajeDeAcceso } from '../correo.ts';
import { codigoDeAccion, enlacePropio, leerCuentaServicio, type TipoEnlace } from '../firebaseAdmin.ts';

export interface DependenciasAcceso {
  pedir?: typeof fetch;
  enviar?: Enviador;
  // Trabajo que sigue tras responder; en produccion EdgeRuntime.waitUntil.
  segundoPlano?: (tarea: Promise<unknown>) => void;
}

const GENERICO = 'Si el correo tiene una cuenta en CODECOMP, te llegara un enlace en unos minutos.';
const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const enSegundoPlano = (tarea: Promise<unknown>) => {
  const runtime = (globalThis as { EdgeRuntime?: { waitUntil(p: Promise<unknown>): void } }).EdgeRuntime;
  if (runtime?.waitUntil) runtime.waitUntil(tarea);
};

const hora = (zona: string) =>
  `${dia(zona)}T${new Intl.DateTimeFormat('en-GB', { timeZone: zona, hour: '2-digit', hourCycle: 'h23' }).format(new Date())}`;

/** Consume un cupo; true si alcanza. Si no se puede revisar, false (sin sesion no se deja pasar). */
const alcanza = async (ctx: Contexto, periodoDia: string, periodoMes: string, maxDia: number, maxMes: number) => {
  try {
    return (await revisarPresupuesto(ctx.sql, periodoDia, periodoMes, maxDia, maxMes)).permitido;
  } catch (error) {
    console.error('Fallo al revisar un cupo de acceso:', (error as Error).message);
    return false;
  }
};

/** Cupo propio de estos correos y, dentro, el cupo general de Resend (compartido con el cron). */
const cupoGlobal = async (ctx: Contexto) => {
  const { config } = ctx;
  const hoy = dia(config.zonaHoraria);
  const esteMes = mes(config.zonaHoraria);
  return await alcanza(ctx, `acceso:${hoy}`, `acceso:${esteMes}`, config.accesoMaxDiario, config.accesoMaxMensual) &&
    await alcanza(ctx, `correo:${hoy}`, `correo:${esteMes}`, config.correoMaxDiario, config.correoMaxMensual);
};

/** Genera el codigo y manda el correo. false si no habia nada que enviar o fallo. */
const enviarEnlace = async (
  ctx: Contexto,
  tipo: TipoEnlace,
  email: string,
  ip: string | null,
  deps: DependenciasAcceso,
) => {
  const cuenta = leerCuentaServicio(ctx.config.firebaseCuentaServicio)!;
  const codigo = await codigoDeAccion(cuenta, tipo, email, ip, deps.pedir ?? fetch);
  if (!codigo) return false;
  const mensaje = { ...mensajeDeAcceso(tipo, email, enlacePropio(ctx.config.appUrl, tipo, codigo)), headers: {} };
  const enviar = deps.enviar ?? enviadorResend(ctx.config);
  return await enviar([mensaje], `acceso-${crypto.randomUUID()}`);
};

const recuperar = async (ctx: Contexto, deps: DependenciasAcceso) => {
  const { config } = ctx;
  const datos = await ctx.req.json().catch(() => ({})) as { email?: unknown };
  const email = typeof datos.email === 'string' ? datos.email.trim().toLowerCase() : '';
  if (!CORREO.test(email) || email.length > 254) {
    return responder(rechazo(400, 'correo', 'Escribe un correo valido, por ejemplo nombre@ufpso.edu.co.'), ctx.cors);
  }

  // Limite por IP (la pone el Worker de Cloudflare); no depende del correo, asi que no lo revela.
  const ip = ctx.req.headers.get('cf-connecting-ip');
  if (ip) {
    const huellaIp = await firma(config.correoFirmaClave, `ip:${ip}`);
    if (!await alcanza(ctx, `acceso-ip:${huellaIp}:${hora(config.zonaHoraria)}`, `acceso-ip:${huellaIp}:${dia(config.zonaHoraria)}`, 5, 20)) {
      return responder(rechazo(429, 'muchos-intentos', 'Hiciste muchos pedidos seguidos. Intentalo de nuevo en una hora.'), ctx.cors);
    }
  }

  // Se responde ya: lo que pasa despues no cambia ni el tiempo ni la respuesta.
  const tarea = (async () => {
    const huella = await firma(config.correoFirmaClave, `correo:${email}`);
    if (!await alcanza(ctx, `acceso-correo:${huella}:${dia(config.zonaHoraria)}`, `acceso-correo:${huella}:${mes(config.zonaHoraria)}`, 3, 10)) return;
    if (!await cupoGlobal(ctx)) return;
    await enviarEnlace(ctx, 'PASSWORD_RESET', email, ip, deps);
  })().catch((error) => console.error('No se pudo enviar el enlace de recuperacion:', (error as Error).message));
  (deps.segundoPlano ?? enSegundoPlano)(tarea);

  return responder({ status: 200, cuerpo: { ok: true, message: GENERICO } }, ctx.cors);
};

const verificar = async (ctx: Contexto, deps: DependenciasAcceso) => {
  const { config, identidad } = ctx;
  if (!identidad?.email) return responder(rechazo(401, 'sin-sesion', 'Inicia sesion para verificar tu correo.'), ctx.cors);
  if (identidad.emailVerificado) return responder({ status: 200, cuerpo: { ok: true, yaVerificado: true } }, ctx.cors);

  const hoy = dia(config.zonaHoraria);
  if (!await alcanza(ctx, `acceso-verificar:${identidad.uid}:${hoy}`, `acceso-verificar:${identidad.uid}:${mes(config.zonaHoraria)}`, 3, 10)) {
    return responder(rechazo(429, 'muchos-intentos', 'Ya te enviamos varios correos hoy. Revisa tu bandeja o intentalo manana.'), ctx.cors);
  }
  if (!await cupoGlobal(ctx)) {
    return responder(rechazo(503, 'cupo-correo', 'Hoy no podemos enviar mas correos. Intentalo manana.'), ctx.cors);
  }
  try {
    const enviado = await enviarEnlace(ctx, 'VERIFY_EMAIL', identidad.email.toLowerCase(), ctx.req.headers.get('cf-connecting-ip'), deps);
    if (enviado) return responder({ status: 200, cuerpo: { ok: true } }, ctx.cors);
  } catch (error) {
    console.error('No se pudo enviar el enlace de verificacion:', (error as Error).message);
  }
  return responder(rechazo(503, 'correo', 'No pudimos enviar el correo. Intentalo en unos minutos.'), ctx.cors);
};

export const acceso = async (ctx: Contexto, accion: string | undefined, deps: DependenciasAcceso = {}) => {
  const { config } = ctx;
  if (ctx.req.method !== 'POST') return responder(rechazo(405, 'metodo', 'Metodo no permitido.'), ctx.cors);
  // Sin llave, Resend o clave de firma, el navegador vuelve a los correos de Firebase.
  if (!leerCuentaServicio(config.firebaseCuentaServicio) || !config.resendApiKey || !config.correoFirmaClave) {
    return responder(rechazo(503, 'no-configurado', 'Correos propios sin configurar.'), ctx.cors);
  }
  if (accion === 'recuperar') return await recuperar(ctx, deps);
  if (accion === 'verificar') return await verificar(ctx, deps);
  return responder(rechazo(404, 'ruta', 'Ruta no encontrada.'), ctx.cors);
};
