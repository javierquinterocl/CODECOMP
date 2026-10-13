import { assertEquals } from '@std/assert';
import { diferencias, filasDeArchivos, validar } from '../../scripts/fundamentos/filas.ts';
import {
  MAX_BORRADOR,
  validarBorrador,
  validarEjercicio,
} from '../functions/_compartido/validacion.ts';

/* ── Archivos de ejercicios ────────────────────────────────────────────── */

Deno.test('los archivos traen 50 ejercicios por nivel y pasan la validacion', () => {
  const filas = filasDeArchivos();
  assertEquals(filas.filter((f) => f.nivel === 'fundamentos').length, 50);
  assertEquals(filas.filter((f) => f.nivel === 'practica').length, 50);
  assertEquals(validar(filas), []);
});

Deno.test('validar detecta numeros repetidos, temas desconocidos y conteos distintos', () => {
  const filas = filasDeArchivos();
  filas[1] = { ...filas[1], numero: filas[0].numero };
  filas[2] = { ...filas[2], tema: 'no-existe' };
  filas.pop();
  const errores = validar(filas);
  assertEquals(errores.some((e) => e.includes('numero repetido')), true);
  assertEquals(errores.some((e) => e.includes('tema desconocido')), true);
  assertEquals(errores.some((e) => e.includes('practica: 49')), true);
});

Deno.test('diferencias compara campo a campo con la fila de la base', () => {
  const [fila] = filasDeArchivos();
  assertEquals(diferencias(fila, { ...fila }), []);
  // La base devuelve las claves de los ejemplos en otro orden.
  const girados = fila.ejemplos.map((ej) => ({ salida: ej.salida, entrada: ej.entrada }));
  assertEquals(diferencias(fila, { ...fila, ejemplos: girados }), []);
  assertEquals(diferencias(fila, { ...fila, titulo: 'Otro', pista_concepto: 'x' }), [
    'titulo',
    'pista_concepto',
  ]);
});

/* ── Cuerpo de las rutas ───────────────────────────────────────────────── */

Deno.test('validarEjercicio exige un nivel conocido y un numero entero positivo', () => {
  assertEquals(validarEjercicio({ nivel: 'practica', numero: 7 }), {
    ok: true,
    ejercicio: { nivel: 'practica', numero: 7 },
  });
  for (const cuerpo of [null, {}, { nivel: 'otro', numero: 1 }, { nivel: 'practica', numero: '7' }, {
    nivel: 'practica',
    numero: 0,
  }]) {
    assertEquals(validarEjercicio(cuerpo).ok, false);
  }
});

Deno.test('validarBorrador acepta el vacio y corta por caracteres', () => {
  const base = { nivel: 'fundamentos', numero: 1 };
  assertEquals(validarBorrador({ ...base, codigo: '' }).ok, true);
  assertEquals(validarBorrador({ ...base, codigo: 'ñ'.repeat(MAX_BORRADOR) }).ok, true);
  assertEquals(validarBorrador(base).ok, false);
  const largo = validarBorrador({ ...base, codigo: 'a'.repeat(MAX_BORRADOR + 1) });
  assertEquals(largo.ok ? 0 : largo.rechazo.status, 413);
});
