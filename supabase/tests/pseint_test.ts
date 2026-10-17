import { assertEquals } from '@std/assert';
import type { Contexto } from '../functions/_compartido/contexto.ts';
import type { Config } from '../functions/_compartido/config.ts';
import {
  type Ejecucion,
  interpretarSalida,
  juzgar,
  normalizar,
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

/* ── Ruta POST /fundamentos/envio ──────────────────────────────────────── */

interface Escenario {
  abiertoHaceSeg?: number | null;
  limite?: Record<string, unknown>;
  limiteFalla?: boolean;
  invocacion?: () => Promise<Ejecucion[]>;
}

// Base de mentira: responde segun la consulta y anota cada una.
const contexto = (esc: Escenario, consultas: string[]): Contexto => {
  const ahora = new Date('2026-10-17T12:00:00Z');
  const filas = (texto: string): unknown[] => {
    if (texto.includes('FROM users')) return [{ id: 'usuario-1', email: 'estudiante@ejemplo.co' }];
    if (texto.includes('FROM fundamentos_ejercicios e')) {
      const abierto = esc.abiertoHaceSeg === null
        ? null
        : new Date(ahora.getTime() - (esc.abiertoHaceSeg ?? 300) * 1000);
      return [{ ejemplos: EJEMPLOS, abierto_en: abierto, ahora }];
    }
    if (texto.includes('registrar_envio_pseint')) return [esc.limite ?? { permitido: true }];
    if (texto.includes('consumir_presupuesto')) {
      return [{ permitido: true, usado_dia: 1, usado_mes: 1 }];
    }
    return [];
  };
  const sql = (partes: TemplateStringsArray) => {
    const texto = partes.join('?');
    consultas.push(texto);
    if (esc.limiteFalla && texto.includes('registrar_envio_pseint')) {
      return Promise.reject(new Error('sin funcion'));
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
  const invocar = (_codigo: string, entradas: string[]) => {
    assertEquals(entradas, ['21', '1']);
    return esc.invocacion ? esc.invocacion() : Promise.resolve([ok(CRUDO.leer), ok(CRUDO.leer)]);
  };
  const res = await envio(contexto(esc, consultas), invocar);
  return {
    status: res.status,
    espera: res.headers.get('Retry-After'),
    cuerpo: await res.json(),
    consultas,
  };
};

Deno.test('envio juzga con los ejemplos de la base y hace dos escrituras', async () => {
  const { status, cuerpo, consultas } = await enviar({});
  assertEquals(status, 200);
  assertEquals(cuerpo.veredicto, 'INCORRECTO');
  assertEquals(
    consultas.filter((c) => /registrar_envio_pseint|consumir_presupuesto/.test(c)).length,
    2,
  );
});

Deno.test('envio respeta el candado de 2 minutos con el reloj de la base', async () => {
  assertEquals((await enviar({ abiertoHaceSeg: 30 })).status, 403);
  assertEquals((await enviar({ abiertoHaceSeg: null })).status, 403);
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

Deno.test('si el limite no se pudo registrar, la caida de la Lambda no descuenta nada', async () => {
  const { status, consultas } = await enviar({
    limiteFalla: true,
    invocacion: () => Promise.reject(new Error('sin red')),
  });
  assertEquals(status, 503);
  assertEquals(consultas.some((c) => c.includes('conteo_pseint - 1')), false);
});
