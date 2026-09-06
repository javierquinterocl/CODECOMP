// Contadores en Postgres via registrar_envio() y consumir_presupuesto() (database/005).

import type { Sql } from './db.ts';

export interface Limite {
  activo: boolean;
  esperaSegundos: number;
  topeDiario: number;
}

// Para desactivar el limite por usuario: activo: false. Nada mas.
export const LIMITE_USUARIO: Limite = {
  activo: true,
  esperaSegundos: 10,
  topeDiario: 100,
};

export interface Veredicto {
  permitido: boolean;
  codigo?: string;
  esperaSegundos?: number;
  mensaje?: string;
  usadoDia?: number;
  usadoMes?: number;
}

export const mensajeDeLimite = (
  codigo: string,
  datos: { esperaSegundos?: number; topeDiario?: number } = {},
): string => {
  switch (codigo) {
    case 'limite-espera':
      return `Espera ${datos.esperaSegundos ?? 0} s antes de enviar de nuevo.`;
    case 'limite-diario':
      return `Llegaste al tope de ${datos.topeDiario ?? 0} envios por hoy.`;
    case 'presupuesto-diario':
      return 'El juez alcanzo su cupo de ejecuciones de hoy. Vuelve manana.';
    case 'presupuesto-mensual':
      return 'El juez alcanzo su cupo de ejecuciones del mes.';
    default:
      return 'No se pudo procesar la solicitud.';
  }
};

export const revisarUsuario = async (
  sql: Sql,
  userId: string,
  dia: string,
  limite: Limite = LIMITE_USUARIO,
): Promise<Veredicto> => {
  if (!limite.activo) return { permitido: true };

  const [fila] = await sql`
    SELECT * FROM registrar_envio(
      ${userId}::uuid, ${dia}::date, ${limite.esperaSegundos}::int, ${limite.topeDiario}::int
    )
  `;

  if (fila.permitido) return { permitido: true };

  const codigo = fila.codigo as string;
  return {
    permitido: false,
    codigo,
    esperaSegundos: fila.espera_segundos as number,
    mensaje: mensajeDeLimite(codigo, {
      esperaSegundos: fila.espera_segundos as number,
      topeDiario: limite.topeDiario,
    }),
  };
};

// Tope global: lo que impide que la factura de RapidAPI se dispare.
export const revisarPresupuesto = async (
  sql: Sql,
  dia: string,
  mes: string,
  maxDiario: number,
  maxMensual: number,
): Promise<Veredicto> => {
  const [fila] = await sql`
    SELECT * FROM consumir_presupuesto(
      ${dia}::text, ${mes}::text, ${maxDiario}::int, ${maxMensual}::int
    )
  `;

  if (fila.permitido) {
    return {
      permitido: true,
      usadoDia: fila.usado_dia as number,
      usadoMes: fila.usado_mes as number,
    };
  }

  const codigo = fila.codigo as string;
  return { permitido: false, codigo, mensaje: mensajeDeLimite(codigo) };
};
