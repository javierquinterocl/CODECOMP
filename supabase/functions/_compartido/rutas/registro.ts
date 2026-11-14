// Registro del estudiante: autorizacion de datos (/datos), actividad (/actividad/abrir y
// /actividad/resumen) y clases (/clases, /clases/unirse). La actividad solo se guarda con
// autorizacion; los envios y las pistas son parte del servicio y se guardan siempre.

import type { Contexto } from '../contexto.ts';
import { esDocente } from '../auth.ts';
import { dia } from '../config.ts';
import { rechazo, responder } from '../http.ts';
import {
  normalizarCodigo,
  normalizarNombreClase,
  nuevoCodigoClase,
  type Resumen,
  tocaPurgar,
  validarResumen,
} from '../registro.ts';
import { idDeUsuario } from '../usuarios.ts';

const leerCuerpo = async (req: Request): Promise<Record<string, unknown> | null> => {
  try {
    const cuerpo = await req.json();
    return cuerpo && typeof cuerpo === 'object' ? cuerpo : null;
  } catch {
    return null;
  }
};

const sinSesion = (ctx: Contexto) =>
  responder(rechazo(401, 'sin-sesion', 'Inicia sesion para continuar.'), ctx.cors);
const metodo = (ctx: Contexto) =>
  responder(rechazo(405, 'metodo', 'Metodo no permitido.'), ctx.cors);

// GET: estado de la autorizacion. POST { acepta }: la registra; al revocar se borra la actividad.
export const datos = async (ctx: Contexto): Promise<Response> => {
  const { req, sql, cors, identidad } = ctx;
  if (!identidad) return sinSesion(ctx);
  try {
    const userId = await idDeUsuario(sql, identidad);
    if (req.method === 'GET') {
      const [fila] = await sql`
        SELECT datos_autorizados, datos_respondido_en, avisos_correo, correo_verificado
        FROM users WHERE id = ${userId}
      `;
      return responder({
        status: 200,
        cuerpo: {
          autorizado: fila.datos_autorizados,
          respondidoEn: fila.datos_respondido_en,
          avisosCorreo: fila.avisos_correo,
          correoVerificado: fila.correo_verificado,
        },
      }, cors);
    }
    if (req.method !== 'POST') return metodo(ctx);
    const cuerpo = await leerCuerpo(req);
    // La preferencia de avisos por correo viaja sola, sin tocar la autorizacion de datos.
    if (cuerpo && 'avisosCorreo' in cuerpo) {
      if (typeof cuerpo.avisosCorreo !== 'boolean') {
        return responder(rechazo(400, 'datos', 'avisosCorreo debe ser verdadero o falso.'), cors);
      }
      await sql`UPDATE users SET avisos_correo = ${cuerpo.avisosCorreo} WHERE id = ${userId}`;
      return responder({ status: 200, cuerpo: { avisosCorreo: cuerpo.avisosCorreo } }, cors);
    }
    const acepta = cuerpo?.acepta;
    if (typeof acepta !== 'boolean') {
      return responder(rechazo(400, 'datos', 'acepta debe ser verdadero o falso.'), cors);
    }
    await sql.begin(async (tx) => {
      await tx`
        UPDATE users SET datos_autorizados = ${acepta}, datos_respondido_en = now()
        WHERE id = ${userId}
      `;
      if (!acepta) {
        await tx`DELETE FROM actividad_diaria WHERE user_id = ${userId}`;
        await tx`DELETE FROM actividad_ejercicio WHERE user_id = ${userId}`;
        await tx`DELETE FROM aperturas_problema WHERE user_id = ${userId}`;
      }
    });
    return responder({ status: 200, cuerpo: { autorizado: acepta } }, cors);
  } catch (error) {
    console.error('Datos error:', error);
    return responder(rechazo(500, 'datos', 'No se pudo guardar tu respuesta.'), cors);
  }
};

let ultimaPurga: string | null = null;

/**
 * Suma el tiempo de cada ejercicio del resumen en dos sentencias (Problemas y Fundamentos).
 * Lo que no exista en el catalogo se descarta en el JOIN.
 */
const guardarTiempoPorEjercicio = async (
  sql: Contexto['sql'],
  userId: string,
  hoy: string,
  resumen: Resumen,
) => {
  const problemas = resumen.ejercicios.filter((e) => e.tipo === 'problema');
  const fundamentos = resumen.ejercicios.filter((e) => e.tipo === 'fundamentos');
  if (problemas.length) {
    await sql`
      INSERT INTO actividad_ejercicio (user_id, dia, problem_id, segundos)
      SELECT ${userId}::uuid, ${hoy}::date, p.id, sum(t.segundos)::int
      FROM unnest(${problemas.map((e) => e.numero)}::int[], ${problemas.map((e) => e.segundos)}::int[])
        AS t(numero, segundos)
      JOIN problems p ON p.problem_number = t.numero
      GROUP BY p.id
      ON CONFLICT (user_id, dia, problem_id) WHERE problem_id IS NOT NULL DO UPDATE SET
        segundos = LEAST(actividad_ejercicio.segundos + EXCLUDED.segundos, 86400),
        actualizado_en = now()
    `;
  }
  if (fundamentos.length) {
    await sql`
      INSERT INTO actividad_ejercicio (user_id, dia, ejercicio_id, segundos)
      SELECT ${userId}::uuid, ${hoy}::date, f.id, sum(t.segundos)::int
      FROM unnest(
        ${fundamentos.map((e) => (e as { nivel: string }).nivel)}::text[],
        ${fundamentos.map((e) => e.numero)}::int[],
        ${fundamentos.map((e) => e.segundos)}::int[]
      ) AS t(nivel, numero, segundos)
      JOIN fundamentos_ejercicios f ON f.nivel = t.nivel AND f.numero = t.numero
      GROUP BY f.id
      ON CONFLICT (user_id, dia, ejercicio_id) WHERE ejercicio_id IS NOT NULL DO UPDATE SET
        segundos = LEAST(actividad_ejercicio.segundos + EXCLUDED.segundos, 86400),
        actualizado_en = now()
    `;
  }
};

const autorizado = async (sql: Contexto['sql'], userId: string): Promise<boolean> => {
  const [fila] = await sql`SELECT datos_autorizados FROM users WHERE id = ${userId}`;
  return fila?.datos_autorizados === true;
};

export const actividad = async (ctx: Contexto, recurso: string | undefined): Promise<Response> => {
  const { req, sql, config, cors, identidad } = ctx;
  if (req.method !== 'POST') return metodo(ctx);
  if (!identidad) return sinSesion(ctx);
  if (recurso !== 'abrir' && recurso !== 'resumen') {
    return responder(rechazo(404, 'ruta', 'Ruta no encontrada.'), cors);
  }
  const cuerpo = await leerCuerpo(req);
  try {
    const userId = await idDeUsuario(sql, identidad);
    if (!(await autorizado(sql, userId))) {
      return responder({ status: 200, cuerpo: { registrado: false } }, cors);
    }

    if (recurso === 'abrir') {
      const numero = cuerpo?.problem_number;
      if (!Number.isInteger(numero)) {
        return responder(rechazo(400, 'datos', 'problem_number es obligatorio.'), cors);
      }
      await sql`
        INSERT INTO aperturas_problema (user_id, problem_id)
        SELECT ${userId}::uuid, id FROM problems WHERE problem_number = ${numero as number}
        ON CONFLICT (user_id, problem_id) DO UPDATE SET ultima = now()
      `;
      return responder({ status: 200, cuerpo: { registrado: true } }, cors);
    }

    const resumen = validarResumen(cuerpo);
    if (!resumen) {
      return responder(rechazo(400, 'datos', 'Resumen de actividad invalido.'), cors);
    }
    // Un dia no puede pasar de 86.400 segundos aunque lleguen resumenes de mas.
    await sql`
      INSERT INTO actividad_diaria (user_id, dia, segundos_activos, pegados, caracteres_pegados)
      VALUES (${userId}, ${dia(config.zonaHoraria)}, ${resumen.segundos}, ${resumen.pegados},
        ${resumen.caracteres})
      ON CONFLICT (user_id, dia) DO UPDATE SET
        segundos_activos = LEAST(actividad_diaria.segundos_activos + EXCLUDED.segundos_activos, 86400),
        pegados = actividad_diaria.pegados + EXCLUDED.pegados,
        caracteres_pegados = actividad_diaria.caracteres_pegados + EXCLUDED.caracteres_pegados,
        actualizado_en = now()
    `;
    await guardarTiempoPorEjercicio(sql, userId, dia(config.zonaHoraria), resumen);
    // La actividad se conserva 12 meses, como dice el aviso de datos: una vez al dia, para todos.
    const hoy = dia(config.zonaHoraria);
    if (tocaPurgar(ultimaPurga, hoy)) {
      ultimaPurga = hoy;
      await sql`DELETE FROM actividad_diaria WHERE dia < (now() - INTERVAL '12 months')::date`;
      await sql`DELETE FROM actividad_ejercicio WHERE dia < (now() - INTERVAL '12 months')::date`;
    }
    return responder({ status: 200, cuerpo: { registrado: true } }, cors);
  } catch (error) {
    console.error('Actividad error:', error);
    return responder(rechazo(500, 'actividad', 'No se pudo registrar la actividad.'), cors);
  }
};

// GET: clases del docente (con cuantos miembros) o del estudiante. POST: el docente crea una.
// POST /clases/unirse { codigo }: el estudiante entra.
export const clases = async (ctx: Contexto, recurso: string | undefined): Promise<Response> => {
  const { req, sql, config, cors, identidad } = ctx;
  if (!identidad) return sinSesion(ctx);
  const docente = esDocente(identidad, config.docentes);
  try {
    const userId = await idDeUsuario(sql, identidad);

    if (recurso === 'unirse') {
      if (req.method !== 'POST') return metodo(ctx);
      const codigo = normalizarCodigo((await leerCuerpo(req))?.codigo);
      const [clase] = codigo
        ? await sql`SELECT id, nombre FROM clases WHERE codigo = ${codigo}`
        : [];
      if (!clase) {
        return responder(rechazo(404, 'codigo', 'No hay ninguna clase con ese codigo.'), cors);
      }
      await sql`
        INSERT INTO clase_miembros (clase_id, user_id) VALUES (${clase.id}, ${userId})
        ON CONFLICT DO NOTHING
      `;
      return responder({ status: 200, cuerpo: { clase: { nombre: clase.nombre } } }, cors);
    }
    if (recurso) return responder(rechazo(404, 'ruta', 'Ruta no encontrada.'), cors);

    if (req.method === 'GET') {
      const filas = docente
        ? await sql`
          SELECT g.id, g.nombre, g.codigo, g.creado_en,
            (SELECT count(*)::int FROM clase_miembros m WHERE m.clase_id = g.id) AS miembros
          FROM clases g WHERE g.docente_id = ${userId} ORDER BY g.creado_en
        `
        : await sql`
          SELECT g.id, g.nombre, m.unido_en FROM clase_miembros m
          JOIN clases g ON g.id = m.clase_id WHERE m.user_id = ${userId} ORDER BY m.unido_en
        `;
      // Companeros de la primera clase para el tablero: solo nombre, nivel y conteos.
      const companeros = filas.length
        ? await sql`
          SELECT u.id = ${userId} AS yo, u.username, u.nivel, u.solved_count AS resueltos,
            (SELECT count(DISTINCT f.ejercicio_id)::int FROM fundamentos_envios f
              WHERE f.user_id = u.id AND f.veredicto = 'ACEPTADO') AS fundamentos_resueltos,
            (SELECT count(*)::int FROM submissions s WHERE s.user_id = u.id
              AND s.verdict NOT IN ('PENDING', 'ERROR_JUEZ')) AS envios, m.unido_en
          FROM clase_miembros m JOIN users u ON u.id = m.user_id
          WHERE m.clase_id = ${filas[0].id}
          ORDER BY u.nivel DESC, u.solved_count DESC LIMIT 50
        `
        : [];
      return responder({ status: 200, cuerpo: { docente, clases: filas, companeros } }, cors);
    }
    if (req.method !== 'POST') return metodo(ctx);
    if (!docente) {
      return responder(rechazo(403, 'rol', 'Solo un docente puede crear clases.'), cors);
    }
    const nombre = normalizarNombreClase((await leerCuerpo(req))?.nombre);
    if (!nombre) {
      return responder(rechazo(400, 'datos', 'El nombre debe tener entre 3 y 80 letras.'), cors);
    }
    // Un choque de codigo es improbable (32^6); se reintenta un par de veces.
    for (let intento = 0; intento < 3; intento++) {
      const [creado] = await sql`
        INSERT INTO clases (nombre, codigo, docente_id)
        VALUES (${nombre}, ${nuevoCodigoClase()}, ${userId})
        ON CONFLICT (codigo) DO NOTHING
        RETURNING id, nombre, codigo
      `;
      if (creado) return responder({ status: 201, cuerpo: { clase: creado } }, cors);
    }
    return responder(rechazo(500, 'clase', 'No se pudo crear la clase.'), cors);
  } catch (error) {
    console.error('Clases error:', error);
    return responder(rechazo(500, 'clase', 'No se pudo completar la operacion.'), cors);
  }
};
