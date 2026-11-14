// Reglas de la cuenta que se revisan en cada peticion: sesiones cerradas y cuentas eliminadas.

import type { Identidad } from './auth.ts';
import type { Sql } from './db.ts';

/** Un token sirve si se inicio sesion despues del ultimo "cerrar sesion en todos". */
export const sesionVigente = (authTime: number | undefined, sesionesDesde: Date | null): boolean => {
  if (!sesionesDesde) return true;
  // Sin auth_time (cookies viejas) no se puede saber: se rechaza.
  if (typeof authTime !== 'number') return false;
  return authTime * 1000 >= sesionesDesde.getTime();
};

/**
 * Devuelve el codigo del rechazo si la cuenta fue eliminada o la sesion se cerro en todos los
 * dispositivos; null si puede seguir. Si la consulta falla se deja pasar (regla por usuario).
 */
export const rechazoDeCuenta = async (
  sql: Sql,
  identidad: Identidad,
): Promise<'cuenta-eliminada' | 'sesion-cerrada' | null> => {
  try {
    const [fila] = await sql`
      SELECT (SELECT sesiones_desde FROM users WHERE firebase_uid = ${identidad.uid}) AS sesiones_desde,
        EXISTS (SELECT 1 FROM solicitudes_borrado
          WHERE firebase_uid = ${identidad.uid} AND estado = 'ejecutada') AS eliminada
    `;
    if (fila?.eliminada) return 'cuenta-eliminada';
    if (!sesionVigente(identidad.authTime, (fila?.sesiones_desde as Date | null) ?? null)) {
      return 'sesion-cerrada';
    }
    return null;
  } catch (error) {
    console.error('No se pudo revisar la sesion:', error);
    return null;
  }
};
