// Actividad del estudiante para Mi progreso y la ficha docente: mapa de 12 meses estilo GitHub
// y tiempo por ejercicio. Los tiempos solo existen si autorizo el registro de actividad.
import type { Sql } from './db.ts';

export interface DiaActividad {
  dia: string; // YYYY-MM-DD en hora de Bogota
  segundos: number; // tiempo activo en la plataforma
  segundosEjercicios: number; // de ese tiempo, el que paso dentro de un ejercicio
  envios: number; // envios de Problemas y Fundamentos (se guardan siempre)
}

export interface CeldaMapa extends DiaActividad {
  nivel: 0 | 1 | 2 | 3;
}

export const SEMANAS_MAPA = 53;

const MS_DIA = 86_400_000;
const fecha = (dia: string) => Date.parse(`${dia}T00:00:00Z`);
const texto = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** Nivel del cuadro por umbrales fijos: minutos activos y, si no hay tiempo, envios. */
export const nivelDeDia = (d: Pick<DiaActividad, 'segundos' | 'envios'>): 0 | 1 | 2 | 3 => {
  const minutos = d.segundos / 60;
  const porTiempo = minutos <= 0 ? 0 : minutos <= 30 ? 1 : minutos <= 90 ? 2 : 3;
  const porEnvios = d.envios <= 0 ? 0 : d.envios <= 2 ? 1 : d.envios <= 5 ? 2 : 3;
  return Math.max(porTiempo, porEnvios) as 0 | 1 | 2 | 3;
};

/**
 * Columnas de semanas (domingo a sabado) que terminan en la semana de `hoy`, como en GitHub.
 * Los dias despues de hoy van en null. `meses` marca la columna donde empieza cada mes.
 */
export const semanasDeActividad = (filas: DiaActividad[], hoy: string) => {
  const porDia = new Map(filas.map((f) => [f.dia, f]));
  const fin = fecha(hoy);
  const domingoFinal = fin - new Date(fin).getUTCDay() * MS_DIA;
  const inicio = domingoFinal - (SEMANAS_MAPA - 1) * 7 * MS_DIA;
  const semanas: (CeldaMapa | null)[][] = [];
  const meses: { columna: number; mes: number }[] = [];
  for (let s = 0; s < SEMANAS_MAPA; s++) {
    const columna: (CeldaMapa | null)[] = [];
    for (let d = 0; d < 7; d++) {
      const ms = inicio + (s * 7 + d) * MS_DIA;
      if (ms > fin) {
        columna.push(null);
        continue;
      }
      const dia = texto(ms);
      const datos = porDia.get(dia) ?? { dia, segundos: 0, segundosEjercicios: 0, envios: 0 };
      columna.push({ ...datos, dia, nivel: nivelDeDia(datos) });
    }
    const mes = new Date(inicio + s * 7 * MS_DIA).getUTCMonth();
    if (!meses.length || meses[meses.length - 1].mes !== mes) meses.push({ columna: s, mes });
    semanas.push(columna);
  }
  const dias = semanas.flat().filter((c): c is CeldaMapa => c !== null);
  return {
    semanas,
    meses,
    totales: {
      diasActivos: dias.filter((c) => c.segundos > 0 || c.envios > 0).length,
      segundos: dias.reduce((t, c) => t + c.segundos, 0),
      segundosEjercicios: dias.reduce((t, c) => t + c.segundosEjercicios, 0),
      envios: dias.reduce((t, c) => t + c.envios, 0),
    },
  };
};

/** Mapa de 12 meses con tiempos (si hay autorizacion) y envios por dia en la zona del proyecto. */
export const mapaDeActividad = async (sql: Sql, userId: string, zona: string, hoy: string) => {
  const [tiempos, ejercicios, envios] = await Promise.all([
    sql<{ dia: string; segundos: number }[]>`
      SELECT dia::text, segundos_activos AS segundos FROM actividad_diaria
      WHERE user_id = ${userId} AND dia > ${hoy}::date - 371
    `,
    sql<{ dia: string; segundos: number }[]>`
      SELECT dia::text, sum(segundos)::int AS segundos FROM actividad_ejercicio
      WHERE user_id = ${userId} AND dia > ${hoy}::date - 371 GROUP BY dia
    `,
    sql<{ dia: string; envios: number }[]>`
      SELECT dia::text, count(*)::int AS envios FROM (
        SELECT (created_at AT TIME ZONE ${zona})::date AS dia FROM submissions
        WHERE user_id = ${userId} AND verdict NOT IN ('PENDING', 'ERROR_JUEZ')
          AND created_at > now() - INTERVAL '372 days'
        UNION ALL
        SELECT (creado_en AT TIME ZONE ${zona})::date FROM fundamentos_envios
        WHERE user_id = ${userId} AND creado_en > now() - INTERVAL '372 days'
      ) e GROUP BY dia
    `,
  ]);
  const dias = new Map<string, DiaActividad>();
  const de = (dia: string) => {
    if (!dias.has(dia)) dias.set(dia, { dia, segundos: 0, segundosEjercicios: 0, envios: 0 });
    return dias.get(dia)!;
  };
  for (const t of tiempos) de(t.dia).segundos = t.segundos;
  for (const e of ejercicios) de(e.dia).segundosEjercicios = e.segundos;
  for (const e of envios) de(e.dia).envios = e.envios;
  return semanasDeActividad([...dias.values()], hoy);
};

/** Tiempo activo por ejercicio en los ultimos 12 meses, con su titulo y si ya lo resolvio. */
export const tiempoPorEjercicio = async (sql: Sql, userId: string) =>
  await sql<{
    tipo: 'problema' | 'fundamentos';
    numero: number;
    nivel: string | null;
    titulo: string;
    segundos: number;
    dias: number;
    resuelto: boolean;
    ultimo: string;
  }[]>`
    SELECT 'problema' AS tipo, p.problem_number AS numero, NULL AS nivel,
      coalesce(p.title_es, p.title) AS titulo, sum(a.segundos)::int AS segundos,
      count(*)::int AS dias, max(a.dia)::text AS ultimo,
      EXISTS (SELECT 1 FROM submissions s WHERE s.user_id = ${userId} AND s.problem_id = p.id
        AND s.verdict = 'ACCEPTED') AS resuelto
    FROM actividad_ejercicio a JOIN problems p ON p.id = a.problem_id
    WHERE a.user_id = ${userId}
    GROUP BY p.id
    UNION ALL
    SELECT 'fundamentos', f.numero, f.nivel, f.titulo, sum(a.segundos)::int, count(*)::int,
      max(a.dia)::text,
      EXISTS (SELECT 1 FROM fundamentos_envios e WHERE e.user_id = ${userId} AND e.ejercicio_id = f.id
        AND e.veredicto = 'ACEPTADO')
    FROM actividad_ejercicio a JOIN fundamentos_ejercicios f ON f.id = a.ejercicio_id
    WHERE a.user_id = ${userId}
    GROUP BY f.id
    ORDER BY segundos DESC
    LIMIT 200
  `;

/** Ejercicios de Fundamentos distintos con al menos un envio aceptado. */
export const fundamentosResueltos = async (sql: Sql, userId: string): Promise<number> => {
  const [fila] = await sql<{ n: number }[]>`
    SELECT count(DISTINCT ejercicio_id)::int AS n FROM fundamentos_envios
    WHERE user_id = ${userId} AND veredicto = 'ACEPTADO'
  `;
  return fila?.n ?? 0;
};

// ---------- Detalle de un dia del mapa ----------

/** Fecha YYYY-MM-DD que existe y cae dentro de la ventana del mapa (hasta 371 dias atras). */
export const fechaValida = (f: string | null, hoy: string): f is string => {
  if (!f || !/^\d{4}-\d{2}-\d{2}$/.test(f)) return false;
  const ms = fecha(f);
  if (Number.isNaN(ms) || texto(ms) !== f) return false;
  return ms <= fecha(hoy) && ms > fecha(hoy) - 371 * MS_DIA;
};

export interface TiempoEjercicioDia {
  tipo: 'problema' | 'fundamentos';
  numero: number;
  nivel: string | null;
  titulo: string;
  tags: string[];
  dificultad: number | null;
  segundos: number;
}

export interface EnviosEjercicioDia extends Omit<TiempoEjercicioDia, 'segundos'> {
  envios: number;
  aceptado: boolean;
  ultimoVeredicto: string;
}

export interface EjercicioDia extends TiempoEjercicioDia {
  envios: number;
  aceptado: boolean;
  ultimoVeredicto: string | null;
}

export const TOPE_EJERCICIOS_DIA = 100;

/** Une tiempo y envios por ejercicio; los totales se calculan antes del tope de filas. */
export const armarDetalleDia = (
  dia: string,
  segundos: number,
  tiempos: TiempoEjercicioDia[],
  envios: EnviosEjercicioDia[],
) => {
  const porClave = new Map<string, EjercicioDia>();
  const clave = (e: { tipo: string; numero: number; nivel: string | null }) => `${e.tipo}:${e.nivel ?? ''}:${e.numero}`;
  for (const t of tiempos) {
    porClave.set(clave(t), { ...t, envios: 0, aceptado: false, ultimoVeredicto: null });
  }
  for (const e of envios) {
    const previo = porClave.get(clave(e));
    if (previo) Object.assign(previo, { envios: e.envios, aceptado: e.aceptado, ultimoVeredicto: e.ultimoVeredicto });
    else porClave.set(clave(e), { ...e, segundos: 0 });
  }
  const ejercicios = [...porClave.values()]
    .sort((a, b) => b.segundos - a.segundos || b.envios - a.envios || a.numero - b.numero);
  return {
    dia,
    segundos,
    segundosEjercicios: tiempos.reduce((t, e) => t + e.segundos, 0),
    envios: envios.reduce((t, e) => t + e.envios, 0),
    aceptados: ejercicios.filter((e) => e.aceptado).length,
    ejercicios: ejercicios.slice(0, TOPE_EJERCICIOS_DIA),
  };
};

/** Tiempo y envios de un dia, por ejercicio, con los mismos filtros que el mapa. */
export const detalleDeDia = async (sql: Sql, userId: string, zona: string, dia: string) => {
  const [activo, tiempos, problemas, fundamentos] = await Promise.all([
    sql<{ segundos: number }[]>`
      SELECT segundos_activos AS segundos FROM actividad_diaria
      WHERE user_id = ${userId} AND dia = ${dia}::date
    `,
    sql<TiempoEjercicioDia[]>`
      SELECT 'problema' AS tipo, p.problem_number AS numero, NULL AS nivel,
        coalesce(p.title_es, p.title) AS titulo, p.difficulty_rating AS dificultad,
        coalesce((SELECT array_agg(t.name::text) FROM problem_tags pt JOIN tags t ON t.id = pt.tag_id
          WHERE pt.problem_id = p.id), '{}'::text[]) AS tags,
        a.segundos
      FROM actividad_ejercicio a JOIN problems p ON p.id = a.problem_id
      WHERE a.user_id = ${userId} AND a.dia = ${dia}::date
      UNION ALL
      SELECT 'fundamentos', f.numero, f.nivel, f.titulo, NULL, '{}'::text[], a.segundos
      FROM actividad_ejercicio a JOIN fundamentos_ejercicios f ON f.id = a.ejercicio_id
      WHERE a.user_id = ${userId} AND a.dia = ${dia}::date
    `,
    sql<EnviosEjercicioDia[]>`
      SELECT 'problema' AS tipo, p.problem_number AS numero, NULL AS nivel,
        coalesce(p.title_es, p.title) AS titulo, p.difficulty_rating AS dificultad,
        coalesce((SELECT array_agg(t.name::text) FROM problem_tags pt JOIN tags t ON t.id = pt.tag_id
          WHERE pt.problem_id = p.id), '{}'::text[]) AS tags,
        count(*)::int AS envios, bool_or(s.verdict = 'ACCEPTED') AS aceptado,
        (array_agg(s.verdict::text ORDER BY s.created_at DESC))[1] AS "ultimoVeredicto"
      FROM submissions s JOIN problems p ON p.id = s.problem_id
      WHERE s.user_id = ${userId} AND s.verdict NOT IN ('PENDING', 'ERROR_JUEZ')
        AND s.created_at >= (${dia}::date)::timestamp AT TIME ZONE ${zona}
        AND s.created_at < (${dia}::date + 1)::timestamp AT TIME ZONE ${zona}
      GROUP BY p.id
    `,
    sql<EnviosEjercicioDia[]>`
      SELECT 'fundamentos' AS tipo, f.numero, f.nivel, f.titulo, NULL AS dificultad, '{}'::text[] AS tags,
        count(*)::int AS envios, bool_or(e.veredicto = 'ACEPTADO') AS aceptado,
        (array_agg(e.veredicto ORDER BY e.creado_en DESC))[1] AS "ultimoVeredicto"
      FROM fundamentos_envios e JOIN fundamentos_ejercicios f ON f.id = e.ejercicio_id
      WHERE e.user_id = ${userId}
        AND e.creado_en >= (${dia}::date)::timestamp AT TIME ZONE ${zona}
        AND e.creado_en < (${dia}::date + 1)::timestamp AT TIME ZONE ${zona}
      GROUP BY f.id
    `,
  ]);
  return armarDetalleDia(dia, activo[0]?.segundos ?? 0, tiempos, [...problemas, ...fundamentos]);
};
