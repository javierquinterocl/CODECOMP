import { assert, assertEquals } from 'jsr:@std/assert';
import {
  MAX_EJERCICIOS_POR_RESUMEN,
  MAX_SEGUNDOS_POR_RESUMEN,
  tocaPurgar,
  validarResumen,
} from '../functions/_compartido/registro.ts';
import { nivelDeDia, SEMANAS_MAPA, semanasDeActividad } from '../functions/_compartido/actividad.ts';
import { dia } from '../functions/_compartido/config.ts';

// ── Tiempo por ejercicio en el resumen ──

Deno.test('validarResumen acepta tiempo de Problemas y de Fundamentos dentro del total', () => {
  const r = validarResumen({
    segundos: 60,
    ejercicios: [
      { tipo: 'problema', numero: 100104, segundos: 30 },
      { tipo: 'fundamentos', nivel: 'practica', numero: 7, segundos: 15 },
    ],
  });
  assertEquals(r?.ejercicios, [
    { tipo: 'problema', numero: 100104, segundos: 30 },
    { tipo: 'fundamentos', nivel: 'practica', numero: 7, segundos: 15 },
  ]);
});

Deno.test('validarResumen rechaza tiempo de ejercicios mayor que el tiempo activo', () => {
  assertEquals(validarResumen({ segundos: 30, ejercicios: [{ tipo: 'problema', numero: 1, segundos: 45 }] }), null);
  assertEquals(
    validarResumen({
      segundos: 30,
      ejercicios: [{ tipo: 'problema', numero: 1, segundos: 20 }, { tipo: 'problema', numero: 2, segundos: 20 }],
    }),
    null,
  );
});

Deno.test('validarResumen rechaza ejercicios mal formados', () => {
  const malos = [
    { tipo: 'otro', numero: 1, segundos: 10 },
    { tipo: 'problema', numero: 1.5, segundos: 10 },
    { tipo: 'problema', numero: 0, segundos: 10 },
    { tipo: 'problema', numero: 1, segundos: 0 },
    { tipo: 'fundamentos', nivel: 'Practica', numero: 1, segundos: 10 },
    { tipo: 'fundamentos', nivel: 'salida-y-variables', numero: 1, segundos: 10 },
    { tipo: 'fundamentos', numero: 1, segundos: 10 },
    null,
  ];
  for (const e of malos) assertEquals(validarResumen({ segundos: 60, ejercicios: [e] }), null, JSON.stringify(e));
  assertEquals(validarResumen({ segundos: 60, ejercicios: 'no' }), null);
});

Deno.test('validarResumen limita la cantidad de ejercicios por resumen', () => {
  const muchos = Array.from({ length: MAX_EJERCICIOS_POR_RESUMEN + 1 }, (_, i) => ({ tipo: 'problema', numero: i + 1, segundos: 1 }));
  assertEquals(validarResumen({ segundos: MAX_SEGUNDOS_POR_RESUMEN, ejercicios: muchos }), null);
  assertEquals(validarResumen({ segundos: MAX_SEGUNDOS_POR_RESUMEN, ejercicios: muchos.slice(1) })?.ejercicios.length, MAX_EJERCICIOS_POR_RESUMEN);
});

Deno.test('tocaPurgar corre una vez por dia', () => {
  assert(tocaPurgar(null, '2026-11-13'));
  assert(!tocaPurgar('2026-11-13', '2026-11-13'));
  assert(tocaPurgar('2026-11-13', '2026-11-14'));
});

// ── Mapa de actividad ──

Deno.test('nivelDeDia usa umbrales fijos de minutos y, si no hay tiempo, los envios', () => {
  assertEquals(nivelDeDia({ segundos: 0, envios: 0 }), 0);
  assertEquals(nivelDeDia({ segundos: 30 * 60, envios: 0 }), 1);
  assertEquals(nivelDeDia({ segundos: 31 * 60, envios: 0 }), 2);
  assertEquals(nivelDeDia({ segundos: 91 * 60, envios: 0 }), 3);
  assertEquals(nivelDeDia({ segundos: 0, envios: 1 }), 1);
  assertEquals(nivelDeDia({ segundos: 0, envios: 6 }), 3);
  assertEquals(nivelDeDia({ segundos: 60, envios: 4 }), 2);
});

Deno.test('semanasDeActividad arma 53 semanas de domingo a sabado que terminan hoy', () => {
  const hoy = '2026-11-13'; // viernes
  const m = semanasDeActividad([], hoy);
  assertEquals(m.semanas.length, SEMANAS_MAPA);
  for (const s of m.semanas) assertEquals(s.length, 7);
  const ultima = m.semanas[SEMANAS_MAPA - 1];
  assertEquals(ultima[0]?.dia, '2026-11-08'); // domingo
  assertEquals(ultima[5]?.dia, hoy);
  assertEquals(ultima[6], null); // el sabado aun no llega
  assertEquals(m.semanas[0][0]?.dia, '2025-11-09'); // 52 semanas antes del domingo final
});

Deno.test('semanasDeActividad pone los datos en su dia y suma los totales', () => {
  const m = semanasDeActividad([
    { dia: '2026-11-13', segundos: 3600, segundosEjercicios: 1800, envios: 2 },
    { dia: '2026-01-01', segundos: 600, segundosEjercicios: 0, envios: 0 },
    { dia: '2020-01-01', segundos: 999, segundosEjercicios: 0, envios: 9 }, // fuera de rango
  ], '2026-11-13');
  const celdas = m.semanas.flat().filter((c) => c);
  assertEquals(celdas.find((c) => c!.dia === '2026-11-13')?.nivel, 2);
  assertEquals(celdas.find((c) => c!.dia === '2026-01-01')?.segundos, 600);
  assertEquals(m.totales, { diasActivos: 2, segundos: 4200, segundosEjercicios: 1800, envios: 2 });
});

Deno.test('semanasDeActividad marca el inicio de cada mes, tambien al cambiar de anio', () => {
  const m = semanasDeActividad([], '2026-11-13');
  const meses = m.meses.map((x) => x.mes);
  assert(meses.length >= 12 && meses.length <= 13);
  const enero = m.meses.find((x) => x.mes === 0);
  assert(enero, 'falta enero');
  assertEquals(m.semanas[enero.columna][0]!.dia.slice(0, 7), '2026-01');
  assertEquals(m.semanas[enero.columna - 1][0]!.dia.slice(0, 7), '2025-12');
});

Deno.test('el dia del registro es el de Bogota, no el UTC', () => {
  // 2026-11-14 03:00 UTC = 2026-11-13 22:00 en Bogota.
  assertEquals(dia('America/Bogota', new Date('2026-11-14T03:00:00Z')), '2026-11-13');
  assertEquals(dia('America/Bogota', new Date('2026-11-14T05:30:00Z')), '2026-11-14');
});
