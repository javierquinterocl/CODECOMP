import { assert, assertEquals } from 'jsr:@std/assert';
import {
  MAX_EJERCICIOS_POR_RESUMEN,
  MAX_SEGUNDOS_POR_RESUMEN,
  tocaPurgar,
  validarResumen,
} from '../functions/_compartido/registro.ts';
import {
  armarDetalleDia,
  type EnviosEjercicioDia,
  fechaValida,
  nivelDeDia,
  SEMANAS_MAPA,
  semanasDeActividad,
  type TiempoEjercicioDia,
  TOPE_EJERCICIOS_DIA,
} from '../functions/_compartido/actividad.ts';
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
  // Sin pegados en el cuerpo, salen en cero.
  assertEquals(r?.ejercicios, [
    { tipo: 'problema', numero: 100104, segundos: 30, pegados: 0, caracteres: 0 },
    { tipo: 'fundamentos', nivel: 'practica', numero: 7, segundos: 15, pegados: 0, caracteres: 0 },
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

Deno.test('fechaValida exige una fecha real dentro de los ultimos 371 dias', () => {
  const hoy = '2026-11-15';
  assertEquals(fechaValida('2026-11-15', hoy), true);
  assertEquals(fechaValida('2025-11-10', hoy), true);
  assertEquals(fechaValida('2025-11-09', hoy), false); // 371 dias atras: fuera del mapa
  assertEquals(fechaValida('2026-11-16', hoy), false); // futuro
  assertEquals(fechaValida('2026-02-30', hoy), false); // no existe
  assertEquals(fechaValida('2026-1-05', hoy), false);
  assertEquals(fechaValida("2026-11-15' OR 1=1", hoy), false);
  assertEquals(fechaValida(null, hoy), false);
});

const tiempoDe = (t: Partial<TiempoEjercicioDia>): TiempoEjercicioDia => ({
  tipo: 'problema', numero: 1, nivel: null, titulo: 'P', tags: [], dificultad: 800, segundos: 0, ...t,
});
const enviosDe = (e: Partial<EnviosEjercicioDia>): EnviosEjercicioDia => ({
  tipo: 'problema', numero: 1, nivel: null, titulo: 'P', tags: [], dificultad: 800,
  envios: 1, aceptado: false, ultimoVeredicto: 'WRONG_ANSWER', ...e,
});

Deno.test('armarDetalleDia une tiempo y envios del mismo ejercicio y ordena por tiempo', () => {
  const d = armarDetalleDia('2026-11-15', 3000, [
    tiempoDe({ numero: 10, segundos: 600 }),
    tiempoDe({ tipo: 'fundamentos', nivel: 'fundamentos', numero: 3, segundos: 1200 }),
  ], [
    enviosDe({ numero: 10, envios: 3, aceptado: true, ultimoVeredicto: 'ACCEPTED' }),
    enviosDe({ tipo: 'fundamentos', nivel: 'practica', numero: 3, envios: 2, ultimoVeredicto: 'ERROR' }),
  ]);
  assertEquals(d.ejercicios.map((e) => `${e.tipo}:${e.nivel}:${e.numero}`), [
    'fundamentos:fundamentos:3', 'problema:null:10', 'fundamentos:practica:3',
  ]);
  assertEquals(d.ejercicios[1], { ...tiempoDe({ numero: 10, segundos: 600 }), envios: 3, aceptado: true, ultimoVeredicto: 'ACCEPTED' });
  // F3 de Practica no tiene tiempo registrado, pero aparece por sus envios.
  assertEquals(d.ejercicios[2].segundos, 0);
  assertEquals(d.ejercicios[0].ultimoVeredicto, null);
  assertEquals({ s: d.segundos, se: d.segundosEjercicios, e: d.envios, a: d.aceptados }, { s: 3000, se: 1800, e: 5, a: 1 });
});

Deno.test('armarDetalleDia calcula los totales antes del tope de filas', () => {
  const muchos = Array.from({ length: TOPE_EJERCICIOS_DIA + 20 }, (_, i) => enviosDe({ numero: i + 1, aceptado: i < 110 }));
  const d = armarDetalleDia('2026-11-15', 0, [], muchos);
  assertEquals(d.ejercicios.length, TOPE_EJERCICIOS_DIA);
  assertEquals(d.envios, TOPE_EJERCICIOS_DIA + 20);
  assertEquals(d.aceptados, 110);
});

Deno.test('los totales del detalle coinciden con la celda del mapa para los mismos datos', () => {
  const tiempos = [tiempoDe({ numero: 1, segundos: 400 }), tiempoDe({ numero: 2, segundos: 200 })];
  const envios = [enviosDe({ numero: 2, envios: 4 }), enviosDe({ numero: 5, envios: 1 })];
  const d = armarDetalleDia('2026-11-14', 900, tiempos, envios);
  const mapa = semanasDeActividad([{ dia: '2026-11-14', segundos: 900, segundosEjercicios: 600, envios: 5 }], '2026-11-15');
  const celda = mapa.semanas.flat().find((c) => c?.dia === '2026-11-14')!;
  assertEquals({ s: d.segundos, se: d.segundosEjercicios, e: d.envios }, { s: celda.segundos, se: celda.segundosEjercicios, e: celda.envios });
});
