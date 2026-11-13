import { assertEquals } from '@std/assert';
import type { Contexto } from '../functions/_compartido/contexto.ts';
import type { Config } from '../functions/_compartido/config.ts';
import type { Ejecucion } from '../functions/_compartido/pseint.ts';
import type { Mensaje, RespuestaIa } from '../functions/_compartido/ia.ts';
import { fundamentos, pista } from '../functions/_compartido/rutas/fundamentos.ts';
import { type Fila, filasDeArchivos, sinEntrada, validarOcultos } from '../../scripts/fundamentos/filas.ts';

const ok = (salida: string): Ejecucion => ({ salida, estado: 'ok' });

/* ── Validacion de los casos ocultos generados ─────────────────────────── */

const FILA: Fila = {
  nivel: 'fundamentos',
  numero: 99,
  tema: 'variables',
  dificultad: 1,
  titulo: 'Doble',
  resumen: 'r',
  descripcion: ['d'],
  entrada: 'Un numero',
  salida: 'Su doble',
  ejemplos: [{ entrada: '3', salida: '6' }],
  pista_concepto: null,
};

Deno.test('validarOcultos acepta y normaliza las salidas del PSeInt oficial', () => {
  const { casos, errores } = validarOcultos(FILA, ['0', '-4', '50'], [ok('6\n'), ok('0\n'), ok('-8  \n'), ok('100\n')]);
  assertEquals(errores, []);
  assertEquals(casos, [
    { entrada: '0', salida: '0' },
    { entrada: '-4', salida: '-8' },
    { entrada: '50', salida: '100' },
  ]);
});

Deno.test('validarOcultos rechaza repetidas, pocas, salidas vacias y referencias equivocadas', () => {
  const repetida = validarOcultos(FILA, ['3\n', '1', '2'], [ok('6'), ok('6'), ok('2'), ok('4')]);
  assertEquals(repetida.errores.some((e) => e.includes('repetida')), true);
  assertEquals(repetida.casos, []);

  const pocas = validarOcultos(FILA, ['1'], [ok('6'), ok('2')]);
  assertEquals(pocas.errores.some((e) => e.includes('caben entre 3 y 4')), true);

  const vacia = validarOcultos(FILA, ['1', '2', '4'], [ok('6'), ok(''), ok('4'), ok('8')]);
  assertEquals(vacia.errores.some((e) => e.includes('vacia')), true);

  const mala = validarOcultos(FILA, ['1', '2', '4'], [ok('7'), ok('2'), ok('4'), ok('8')]);
  assertEquals(mala.errores.some((e) => e.includes('no pasa los visibles')), true);

  const tiempo = validarOcultos(FILA, ['1', '2', '4'], [ok('6'), ok('2'), { salida: '', estado: 'tiempo' }, ok('8')]);
  assertEquals(tiempo.errores.some((e) => e.includes('no termina')), true);
});

Deno.test('validarOcultos respeta el tope de 10 casos del juez', () => {
  const seis = { ...FILA, ejemplos: Array.from({ length: 7 }, (_, i) => ({ entrada: `${i}`, salida: `${i * 2}` })) };
  const r = validarOcultos(seis, ['10', '11', '12', '13'], []);
  assertEquals(r.errores.some((e) => e.includes('caben entre 3 y 3')), true);
});

Deno.test('los ejercicios sin entrada no llevan ocultos', () => {
  const hola = { ...FILA, ejemplos: [{ entrada: '', salida: 'Hola Mundo' }] };
  assertEquals(sinEntrada(hola), true);
  assertEquals(validarOcultos(hola, [], []), { casos: [], errores: [] });
  assertEquals(validarOcultos(hola, ['x'], []).errores.length, 1);
  // Los archivos reales tienen algunos asi; ninguno con entrada pasa por sin entrada.
  assertEquals(filasDeArchivos().filter(sinEntrada).length > 0, true);
});

/* ── Lo que llega al navegador ─────────────────────────────────────────── */

Deno.test('el listado de ejercicios nunca pide los casos ocultos ni la solucion', async () => {
  const consultas: string[] = [];
  const sql = (partes: TemplateStringsArray) => {
    consultas.push(partes.join('?'));
    return Promise.resolve([]);
  };
  await fundamentos({
    req: new Request('http://local/fundamentos/ejercicios'),
    url: new URL('http://local/fundamentos/ejercicios'),
    sql: sql as unknown as Contexto['sql'],
    config: {} as Config,
    cors: {},
    identidad: null,
  }, 'ejercicios');
  assertEquals(consultas.length, 1);
  assertEquals(/casos_ocultos|solucion_referencia|\*/.test(consultas[0]), false);
});

/* ── POST /fundamentos/pista ───────────────────────────────────────────── */

const ENVIO_ID = '7f1c2a9e-3b4d-4e5f-8a6b-1c2d3e4f5a6b';

interface Caso {
  cuerpo?: unknown;
  envio?: Record<string, unknown> | null;
  espera?: boolean;
}

const pedirPista = async (caso: Caso) => {
  const consultas: string[] = [];
  const mensajes: Mensaje[][] = [];
  const envio = caso.envio === null ? null : {
    id: ENVIO_ID,
    ejercicio_id: 7,
    codigo: 'Algoritmo doble\n Leer n\n Escribir n+n\nFinAlgoritmo',
    veredicto: 'INCORRECTO',
    ejemplo_fallido: 2,
    oculto: true,
    detalle: null,
    vigente: true,
    titulo: 'Doble',
    descripcion: ['Lee un numero y escribe su doble.'],
    entrada: 'Un numero',
    salida: 'Su doble',
    ejemplos: [{ entrada: '3', salida: '6' }],
    ...caso.envio,
  };
  const sql = (partes: TemplateStringsArray) => {
    const texto = partes.join('?');
    consultas.push(texto);
    if (texto.includes('FROM users')) return Promise.resolve([{ id: 'usuario-1' }]);
    if (texto.includes('FROM fundamentos_envios f')) return Promise.resolve(envio ? [envio] : []);
    if (texto.includes('registrar_pista')) {
      return Promise.resolve([caso.espera ? { permitido: false, espera_segundos: 40 } : { permitido: true }]);
    }
    if (texto.includes('consumir_presupuesto')) return Promise.resolve([{ permitido: true }]);
    return Promise.resolve([]);
  };
  const preguntar = (m: Mensaje[]): Promise<RespuestaIa> => {
    mensajes.push(m);
    return Promise.resolve({ ok: true, texto: 'Que pasa si el numero es cero?' });
  };
  const res = await pista({
    req: new Request('http://local/fundamentos/pista', {
      method: 'POST',
      body: JSON.stringify(caso.cuerpo ?? { envio_id: ENVIO_ID }),
    }),
    url: new URL('http://local/fundamentos/pista'),
    sql: sql as unknown as Contexto['sql'],
    config: {
      iaApiKey: 'llave-inventada',
      iaEsperaSegundos: 60,
      iaMaxDiario: 200,
      iaMaxMensual: 2000,
      iaMaxCodigo: 3500,
      iaMaxEnunciado: 1200,
      iaMaxError: 400,
      zonaHoraria: 'America/Bogota',
    } as Config,
    cors: {},
    identidad: { uid: 'firebase-1', email: 'estudiante@ejemplo.co' } as Contexto['identidad'],
  }, preguntar);
  return {
    status: res.status,
    reintentar: res.headers.get('Retry-After'),
    cuerpo: await res.json(),
    consultas,
    mensajes,
    espera: consultas.some((c) => c.includes('registrar_pista')),
  };
};

Deno.test('la pista de un fallo oculto llega y se guarda, sin datos del caso', async () => {
  const r = await pedirPista({});
  assertEquals(r.status, 200);
  assertEquals(r.cuerpo.hint, 'Que pasa si el numero es cero?');
  const texto = r.mensajes[0].map((m) => m.content).join('\n');
  assertEquals(texto.includes('CASO OCULTO'), true);
  assertEquals(texto.includes('EJEMPLO QUE FALLO'), false);
  assertEquals(r.consultas.some((c) => c.includes('INSERT INTO fundamentos_pistas')), true);
});

Deno.test('la pista de un fallo visible lleva la entrada del ejemplo y la salida obtenida', async () => {
  const r = await pedirPista({ envio: { oculto: false, ejemplo_fallido: 1, detalle: '7' } });
  const texto = r.mensajes[0][1].content;
  assertEquals(texto.includes('EJEMPLO QUE FALLO: 1\nENTRADA:\n3'), true);
  assertEquals(texto.includes('SALIDA DEL ESTUDIANTE:\n7'), true);
});

Deno.test('la pista rechaza antes de gastar la espera o el presupuesto', async () => {
  const casos: [Caso, number][] = [
    [{ cuerpo: { envio_id: 'no-es-uuid' } }, 400],
    [{ envio: null }, 404],
    [{ envio: { veredicto: 'ACEPTADO' } }, 400],
    [{ envio: { veredicto: 'FALLO' } }, 400],
    [{ envio: { vigente: false } }, 400],
  ];
  for (const [caso, status] of casos) {
    const r = await pedirPista(caso);
    assertEquals(r.status, status);
    assertEquals(r.espera, false);
    assertEquals(r.mensajes.length, 0);
  }
});

Deno.test('la pista respeta la espera entre pistas con Retry-After', async () => {
  const r = await pedirPista({ espera: true });
  assertEquals(r.status, 429);
  assertEquals(r.reintentar, '40');
  assertEquals(r.mensajes.length, 0);
});
