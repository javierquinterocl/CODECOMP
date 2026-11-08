// GET /notificaciones: avisos de la campana, calculados con datos que ya existen (sin tabla).
// Cada aviso lleva un id estable (el navegador recuerda los leidos), su tipo y sus datos;
// el texto lo arma el frontend.

import type { Contexto } from '../contexto.ts';
import { esDocente } from '../auth.ts';
import { dia } from '../config.ts';
import { DIAS_PARA_CERRAR } from '../nivel.ts';
import { escalonDelUsuario } from '../escalon.ts';
import { rachaDelUsuario } from '../racha.ts';
import { rechazo, responder } from '../http.ts';
import { idDeUsuario } from '../usuarios.ts';
import { estudiantesDeClase } from './docente.ts';

const MS_DIA = 86_400_000;
// Se avisa cuando faltan estos dias o menos para que un problema se cierre sin resolver.
export const AVISAR_CIERRE_DIAS = 3;

interface Aviso {
  id: string;
  tipo: 'racha' | 'cierre' | 'alertas' | 'nuevos';
  datos: Record<string, unknown>;
}

export const notificaciones = async (ctx: Contexto): Promise<Response> => {
  const { req, sql, config, cors, identidad } = ctx;
  if (req.method !== 'GET') return responder(rechazo(405, 'metodo', 'Metodo no permitido.'), cors);
  if (!identidad) {
    return responder(rechazo(401, 'sin-sesion', 'Inicia sesion para ver tus avisos.'), cors);
  }
  try {
    const userId = await idDeUsuario(sql, identidad);
    const hoy = dia(config.zonaHoraria);
    const avisos: Aviso[] = [];

    if (esDocente(identidad, config.docentes)) {
      const clases = await sql`SELECT id, nombre FROM clases WHERE docente_id = ${userId}`;
      for (const clase of clases) {
        const estudiantes = await estudiantesDeClase(sql, clase.id as string);
        const conAlertas = estudiantes.filter((e) => e.alertas.length).length;
        if (conAlertas) {
          avisos.push({
            id: `alertas-${clase.id}-${hoy}-${conAlertas}`,
            tipo: 'alertas',
            datos: { cantidad: conAlertas, clase: clase.nombre },
          });
        }
        const nuevos = estudiantes.filter((e) => Date.now() - e.unidoEn.getTime() < 7 * MS_DIA);
        if (nuevos.length) {
          avisos.push({
            id: `nuevos-${clase.id}-${nuevos.map((e) => e.id).sort().join('.')}`,
            tipo: 'nuevos',
            datos: { cantidad: nuevos.length, clase: clase.nombre },
          });
        }
      }
      return responder({ status: 200, cuerpo: { notificaciones: avisos, escalon: null } }, cors);
    }

    const { racha, envioHoy } = await rachaDelUsuario(sql, userId, config.zonaHoraria);
    if (racha > 0 && !envioHoy) {
      avisos.push({ id: `racha-${hoy}`, tipo: 'racha', datos: { racha } });
    }

    // Problemas con fallos, sin aceptar y aun abiertos para el nivel: se cierran a los 7 dias.
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
    for (const p of abiertos) {
      const pasados = (Date.now() - (p.primer_fallo as Date).getTime()) / MS_DIA;
      const quedan = Math.ceil(DIAS_PARA_CERRAR - pasados);
      if (quedan > 0 && quedan <= AVISAR_CIERRE_DIAS) {
        avisos.push({
          id: `cierre-${p.numero}-${quedan}`,
          tipo: 'cierre',
          datos: { numero: p.numero, titulo: p.titulo_es || p.titulo, quedan },
        });
      }
    }

    // El escalon va aparte: el navegador avisa si subio desde la ultima vez que lo vio.
    const escalon = await escalonDelUsuario(sql, userId);
    return responder({ status: 200, cuerpo: { notificaciones: avisos, escalon: escalon.actual } }, cors);
  } catch (error) {
    console.error('Notificaciones error:', error);
    return responder(rechazo(500, 'consulta', 'No se pudieron cargar tus avisos.'), cors);
  }
};
