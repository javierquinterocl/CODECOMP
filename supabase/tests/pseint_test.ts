import { assertEquals } from '@std/assert';
import type { Contexto } from '../functions/_compartido/contexto.ts';
import type { Config } from '../functions/_compartido/config.ts';
import {
  detalleDe,
  type Ejecucion,
  interpretarSalida,
  invocadorLambda,
  juzgar,
  normalizar,
  ocultarCredenciales,
  paraNavegador,
} from '../functions/_compartido/pseint.ts';
import { envio } from '../functions/_compartido/rutas/fundamentos.ts';

// Salidas crudas del PSeInt oficial capturadas en la Lambda de prueba.
const E = '\x1b';
const CRUDO = {
  leer: `${E}[zp2:1;Edad: ${E}[zp3:1;> 21\n${E}[zp4:1;> ${E}[zp4:1;42\n`,
  sintaxis: `${E}[ze4:1;Lin 4 (inst 1): ERROR 106: Instrucción no válida.\n` +
    `${E}[ze5:1;Lin 3 (inst 1): ERROR 117: Falta cerrar SI.\n`,
  sinDatos: `${E}[zp2:1;> 5\n${E}[zp3:1;> <<No hay más datos de entrada>>\n`,
  ejecucion: `${E}[ze3:1;Lin 3 (inst 1): ERROR 303: Subindice (0) fuera de rango (1...3).\n`,
  pantalla: `***LimpiarPantalla***\n${E}[zp3:1;z\n***Esperar2000***\n`,
};

const ok = (salida: string): Ejecucion => ({ salida, estado: 'ok' });

/* ── Lectura de la salida ──────────────────────────────────────────────── */

Deno.test('interpretarSalida quita el "> dato" de cada Leer y conserva lo que escribe el estudiante', () => {
  assertEquals(interpretarSalida(CRUDO.leer, '21'), { tipo: 'ok', salida: 'Edad: > 42\n' });
});

Deno.test('interpretarSalida devuelve el primer error con su linea y numero', () => {
  assertEquals(interpretarSalida(CRUDO.sintaxis, ''), {
    tipo: 'error',
    salida: '',
    linea: 4,
    numero: 106,
    mensaje: 'Instrucción no válida.',
  });
  const r = interpretarSalida(CRUDO.ejecucion, '');
  assertEquals(r.tipo === 'error' && [r.linea, r.numero], [3, 303]);
});

Deno.test('interpretarSalida detecta un Leer sin datos', () => {
  assertEquals(interpretarSalida(CRUDO.sinDatos, '5'), { tipo: 'sin-datos', salida: '', linea: 3 });
});

Deno.test('interpretarSalida ignora Borrar Pantalla y Esperar', () => {
  assertEquals(interpretarSalida(CRUDO.pantalla, ''), { tipo: 'ok', salida: 'z\n' });
});

Deno.test('normalizar ignora espacios al final de linea, lineas vacias finales y \\r', () => {
  assertEquals(normalizar('a  \r\nb\t\n\n'), 'a\nb');
  assertEquals(normalizar(' a b'), ' a b');
});

Deno.test('ocultarCredenciales tapa llaves de AWS y secretos largos, no la salida normal', () => {
  // Valores inventados con la forma de una llave temporal y de un secreto.
  const falso = 'ASIAEJEMPLO000000000 y abcdEJEMPLO/secreto+inventado0123456789xyz';
  assertEquals(ocultarCredenciales(falso), '[oculto] y [oculto]');
  assertEquals(ocultarCredenciales('3 x 10 = 30\n3628800\nGana A'), '3 x 10 = 30\n3628800\nGana A');
  const separador = '='.repeat(50) + '\n' + '*'.repeat(50) + '\n' + 'a'.repeat(45);
  assertEquals(ocultarCredenciales(separador), separador);
});

/* ── Veredicto ─────────────────────────────────────────────────────────── */

const EJEMPLOS = [{ entrada: '21', salida: 'Edad: > 42' }, { entrada: '1', salida: 'Edad: > 2' }];

Deno.test('juzgar acepta cuando todos los ejemplos coinciden', () => {
  const segunda = `${E}[zp2:1;Edad: ${E}[zp3:1;> 1\n${E}[zp4:1;> ${E}[zp4:1;2\n`;
  assertEquals(juzgar(EJEMPLOS, [ok(CRUDO.leer), ok(segunda)]), {
    veredicto: 'ACEPTADO',
    ejemplos: 2,
  });
});

Deno.test('juzgar senala el primer ejemplo que no coincide, con las dos salidas', () => {
  // El "> 21" no es el eco del dato de este ejemplo (1): se conserva como salida.
  assertEquals(juzgar(EJEMPLOS, [ok(CRUDO.leer), ok(CRUDO.leer)]), {
    veredicto: 'INCORRECTO',
    ejemplo: 2,
    entrada: '1',
    esperada: 'Edad: > 2',
    obtenida: 'Edad: > 21\n> 42\n',
  });
});

Deno.test('juzgar distingue error, falta de datos, ciclo infinito y salida excesiva', () => {
  assertEquals(juzgar(EJEMPLOS, [ok(CRUDO.sintaxis)]).veredicto, 'ERROR');
  assertEquals(juzgar(EJEMPLOS, [ok(CRUDO.sinDatos)]).veredicto, 'SIN_DATOS');
  assertEquals(juzgar(EJEMPLOS, [{ salida: '', estado: 'tiempo' }]), {
    veredicto: 'NO_TERMINA',
    ejemplo: 1,
  });
  assertEquals(juzgar(EJEMPLOS, [{ salida: 'x', estado: 'salida' }]).veredicto, 'DEMASIADA_SALIDA');
  // La Lambda deja de evaluar tras un ciclo infinito: lo que falte no es un acierto.
  assertEquals(juzgar(EJEMPLOS, [ok(CRUDO.leer)]).veredicto, 'FALLO');
});

/* ── Invocacion de la Lambda ───────────────────────────────────────────── */

// Llave inventada: la firma se calcula pero nunca sale a la red.
const CONFIG_FALSA = {
  pseintAccessKeyId: 'AKIAEJEMPLOINVENTADO',
  pseintSecretAccessKey: 'secreto-inventado-solo-para-tests',
  pseintRegion: 'us-east-1',
  pseintFuncion: 'codecomp-pseint',
  pseintTimeoutMs: 12000,
} as Config;

const conRespuestas = async (estados: number[], probar: () => Promise<void>) => {
  const original = globalThis.fetch;
  let llamadas = 0;
  globalThis.fetch = () => {
    const status = estados[Math.min(llamadas++, estados.length - 1)];
    const cuerpo = status === 200 ? { resultados: [ok('1\n')] } : { Reason: 'x' };
    return Promise.resolve(new Response(JSON.stringify(cuerpo), { status }));
  };
  try {
    await probar();
  } finally {
    globalThis.fetch = original;
  }
  return llamadas;
};

Deno.test('invocadorLambda reintenta la saturacion (429), que no ejecuto nada', async () => {
  const llamadas = await conRespuestas([429, 429, 200], async () => {
    assertEquals(await invocadorLambda(CONFIG_FALSA)('c', ['']), [ok('1\n')]);
  });
  assertEquals(llamadas, 3);
});

Deno.test('invocadorLambda no reintenta otros errores: podrian haber ejecutado el codigo', async () => {
  const llamadas = await conRespuestas([502, 200], async () => {
    const fallo = await invocadorLambda(CONFIG_FALSA)('c', ['']).then(() => null, (e) => e);
    assertEquals(fallo instanceof Error, true);
  });
  assertEquals(llamadas, 1);
});

/* ── Casos ocultos ─────────────────────────────────────────────────────── */

// Dos visibles y uno oculto: el oculto pide 7 y espera 14.
const CON_OCULTO = [...EJEMPLOS, { entrada: '7', salida: 'Edad: > 14' }];
const eco = (dato: string, sale: string) =>
  `${E}[zp2:1;Edad: ${E}[zp3:1;> ${dato}\n${E}[zp4:1;> ${E}[zp4:1;${sale}\n`;
const BIEN = [ok(eco('21', '42')), ok(eco('1', '2'))];

Deno.test('juzgar sin ocultos se comporta igual que antes', () => {
  assertEquals(juzgar(EJEMPLOS, BIEN, 2), juzgar(EJEMPLOS, BIEN));
});

Deno.test('juzgar con ocultos acepta si pasan todos los casos', () => {
  assertEquals(juzgar(CON_OCULTO, [...BIEN, ok(eco('7', '14'))], 2), {
    veredicto: 'ACEPTADO',
    ejemplos: 3,
  });
});

Deno.test('un fallo en un ejemplo visible sigue mostrando la comparacion', () => {
  const r = juzgar(CON_OCULTO, [ok(eco('21', '42')), ok(eco('1', '3'))], 2);
  assertEquals(r.veredicto === 'INCORRECTO' && 'esperada' in r && r.esperada, 'Edad: > 2');
  assertEquals('oculto' in r, false);
});

Deno.test('un fallo en un caso oculto no lleva entrada, salidas ni mensaje', () => {
  const incorrecto = juzgar(CON_OCULTO, [...BIEN, ok(eco('7', '15'))], 2);
  assertEquals(incorrecto, { veredicto: 'INCORRECTO', oculto: true, ejemplo: 3 });
  assertEquals(paraNavegador(incorrecto), { veredicto: 'INCORRECTO', oculto: true });
  assertEquals(detalleDe(incorrecto), null);

  // El mensaje de PSeInt lleva numeros que pueden venir de la entrada oculta.
  const error = juzgar(CON_OCULTO, [...BIEN, ok(CRUDO.ejecucion)], 2);
  assertEquals(error, { veredicto: 'ERROR', oculto: true, ejemplo: 3, linea: 3, numero: 303 });
  assertEquals(JSON.stringify(paraNavegador(error)).includes('rango'), false);

  assertEquals(paraNavegador(juzgar(CON_OCULTO, [...BIEN, { salida: '', estado: 'tiempo' }], 2)), {
    veredicto: 'NO_TERMINA',
    oculto: true,
  });
  assertEquals(paraNavegador(juzgar(CON_OCULTO, [...BIEN, ok(CRUDO.sinDatos)], 2)), {
    veredicto: 'SIN_DATOS',
    oculto: true,
    linea: 3,
  });
});

Deno.test('detalleDe guarda la salida o el error de un ejemplo visible', () => {
  assertEquals(detalleDe(juzgar(EJEMPLOS, [ok(CRUDO.leer), ok(CRUDO.leer)])), 'Edad: > 21\n> 42\n');
  assertEquals(
    detalleDe(juzgar(EJEMPLOS, [ok(CRUDO.ejecucion)])),
    'linea 3: Subindice (0) fuera de rango (1...3).',
  );
  assertEquals(detalleDe(juzgar(EJEMPLOS, BIEN)), null);
});

/* ── Ruta POST /fundamentos/envio ──────────────────────────────────────── */

interface Escenario {
  abiertoHaceSeg?: number | null;
  ocultos?: { entrada: string; salida: string }[];
  limite?: Record<string, unknown>;
  limiteFalla?: boolean;
  avisosFallan?: boolean;
  sinPresupuesto?: boolean;
  invocacion?: () => Promise<Ejecucion[]>;
}

// Base de mentira: responde segun la consulta y anota cada una con sus valores.
const contexto = (esc: Escenario, consultas: string[], valores: unknown[][] = []): Contexto => {
  const filas = (texto: string): unknown[] => {
    if (texto.includes('FROM users')) return [{ id: 'usuario-1', email: 'estudiante@ejemplo.co' }];
    if (texto.includes('FROM fundamentos_ejercicios e')) {
      const abierto = esc.abiertoHaceSeg === null
        ? null
        : new Date(Date.now() - (esc.abiertoHaceSeg ?? 300) * 1000);
      return [{ id: 7, ejemplos: EJEMPLOS, casos_ocultos: esc.ocultos ?? [], abierto_en: abierto }];
    }
    if (texto.includes('registrar_envio_pseint')) return [esc.limite ?? { permitido: true }];
    if (texto.includes('consumir_presupuesto')) {
      return esc.sinPresupuesto
        ? [{ permitido: false, codigo: 'presupuesto-diario' }]
        : [{ permitido: true, usado_dia: 1, usado_mes: 1 }];
    }
    if (texto.includes('INSERT INTO fundamentos_envios')) return [{ id: 'envio-1' }];
    return [];
  };
  const sql = (partes: TemplateStringsArray, ...args: unknown[]) => {
    const texto = partes.join('?');
    consultas.push(texto);
    valores.push(args);
    if (esc.limiteFalla && texto.includes('registrar_envio_pseint')) {
      return Promise.reject(new Error('sin funcion'));
    }
    if (esc.avisosFallan && texto.includes('INSERT INTO notificaciones')) {
      return Promise.reject(new Error('sin tabla'));
    }
    return Promise.resolve(filas(texto));
  };
  const cuerpo = { nivel: 'fundamentos', numero: 7, codigo: 'Algoritmo a\nFinAlgoritmo' };
  return {
    req: new Request('http://local/fundamentos/envio', {
      method: 'POST',
      body: JSON.stringify(cuerpo),
    }),
    url: new URL('http://local/fundamentos/envio'),
    sql: sql as unknown as Contexto['sql'],
    config: {
      zonaHoraria: 'America/Bogota',
      pseintEsperaSegundos: 5,
      pseintTopeDiario: 200,
      pseintMaxDiario: 3000,
      pseintMaxMensual: 30000,
    } as Config,
    cors: {},
    identidad: { uid: 'firebase-1', email: 'estudiante@ejemplo.co' } as Contexto['identidad'],
  };
};

const enviar = async (esc: Escenario) => {
  const consultas: string[] = [];
  const valores: unknown[][] = [];
  let pedidas: string[] = [];
  const invocar = (_codigo: string, entradas: string[]) => {
    pedidas = entradas;
    return esc.invocacion ? esc.invocacion() : Promise.resolve([ok(CRUDO.leer), ok(CRUDO.leer)]);
  };
  const res = await envio(contexto(esc, consultas, valores), invocar);
  const i = consultas.findIndex((c) => c.includes('INSERT INTO fundamentos_envios'));
  return {
    status: res.status,
    espera: res.headers.get('Retry-After'),
    cuerpo: await res.json(),
    consultas,
    pedidas,
    guardado: i >= 0 ? valores[i] : null,
  };
};

Deno.test('envio juzga con los ejemplos de la base, hace dos escrituras y devuelve el id', async () => {
  const { status, cuerpo, consultas, pedidas } = await enviar({});
  assertEquals(status, 200);
  assertEquals(pedidas, ['21', '1']);
  assertEquals(cuerpo.veredicto, 'INCORRECTO');
  assertEquals(cuerpo.envio_id, 'envio-1');
  assertEquals(
    consultas.filter((c) => /registrar_envio_pseint|consumir_presupuesto/.test(c)).length,
    2,
  );
});

Deno.test('envio ya no tiene candado: se puede enviar recien abierto', async () => {
  assertEquals((await enviar({ abiertoHaceSeg: 1, invocacion: () => Promise.resolve(BIEN) })).status, 200);
  // Si la apertura no se guardo, el envio la registra igual (la usan el registro y el docente).
  const sinApertura = await enviar({ abiertoHaceSeg: null });
  assertEquals(sinApertura.status, 200);
  assertEquals(
    sinApertura.consultas.some((c) => c.includes('INSERT INTO fundamentos_progreso')),
    true,
  );
});

Deno.test('envio manda tambien los casos ocultos y no revela el que fallo', async () => {
  const r = await enviar({
    ocultos: [{ entrada: '7', salida: 'Edad: > 14' }],
    invocacion: () => Promise.resolve([...BIEN, ok(eco('7', '99'))]),
  });
  assertEquals(r.pedidas, ['21', '1', '7']);
  assertEquals(r.cuerpo, { veredicto: 'INCORRECTO', oculto: true, envio_id: 'envio-1' });
  // Se guarda el numero y la marca para el docente, pero nada de la salida.
  const guardado = r.guardado!;
  assertEquals(guardado.slice(3), ['INCORRECTO', 3, true, null]);
});

Deno.test('un aceptado crea el aviso de resuelto, y si el aviso falla el envio sigue bien', async () => {
  const bien = await enviar({ invocacion: () => Promise.resolve(BIEN) });
  assertEquals(bien.cuerpo.veredicto, 'ACEPTADO');
  assertEquals(bien.consultas.some((c) => c.includes('INSERT INTO notificaciones')), true);
  const conFallo = await enviar({ avisosFallan: true, invocacion: () => Promise.resolve(BIEN) });
  assertEquals(conFallo.status, 200);
  assertEquals(conFallo.cuerpo.veredicto, 'ACEPTADO');
  const fallido = await enviar({});
  assertEquals(fallido.consultas.some((c) => c.includes('INSERT INTO notificaciones')), false);
});

Deno.test('envio guarda el detalle de un fallo visible', async () => {
  const { guardado } = await enviar({});
  assertEquals(guardado!.slice(3), ['INCORRECTO', 2, false, 'Edad: > 21\n> 42\n']);
});


Deno.test('envio devuelve 429 con la espera del estudiante', async () => {
  const { status, espera } = await enviar({
    limite: { permitido: false, codigo: 'limite-espera', espera_segundos: 4 },
  });
  assertEquals(status, 429);
  assertEquals(espera, '4');
});

Deno.test('si la Lambda falla responde 503 y devuelve el envio al estudiante', async () => {
  const { status, cuerpo, consultas } = await enviar({
    invocacion: () => Promise.reject(new Error('sin red')),
  });
  assertEquals(status, 503);
  assertEquals(cuerpo.codigo, 'juez-no-disponible');
  const reembolso = consultas.find((c) => c.includes('conteo_pseint - 1'));
  // Devuelve el envio pero no borra la espera: si no, una caida invitaria a reenviar en rafaga.
  assertEquals(Boolean(reembolso) && !reembolso!.includes('ultimo_pseint'), true);
});

Deno.test('si el tope global corta, el envio no cuenta para el estudiante', async () => {
  const { status, consultas } = await enviar({ sinPresupuesto: true });
  assertEquals(status, 503);
  assertEquals(consultas.some((c) => c.includes('conteo_pseint - 1')), true);
});

Deno.test('si el limite no se pudo registrar, la caida de la Lambda no descuenta nada', async () => {
  const { status, consultas } = await enviar({
    limiteFalla: true,
    invocacion: () => Promise.reject(new Error('sin red')),
  });
  assertEquals(status, 503);
  assertEquals(consultas.some((c) => c.includes('conteo_pseint - 1')), false);
});