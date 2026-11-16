import { assertEquals } from '@std/assert';
import * as R from '../../src/scripts/reporteClaseDatos.js';

// deno-lint-ignore no-explicit-any
const { archivoDelReporte, datosDelReporte } = R as any;
const HOY = new Date('2026-11-16T12:00:00Z');
const hace = (dias: number) => new Date(HOY.getTime() - dias * 86_400_000).toISOString();

const PANEL = {
  clase: { id: 'c1', nombre: 'Maratón A' },
  estudiantes: [
    { username: 'ana', email: 'ana@ejemplo.co', nivel: 1210.4, resueltos: 8, fundamentosResueltos: 4, envios: 30, segundosSemana: 3600, alertas: [], ultimaActividad: hace(1) },
    { username: 'beto', email: 'b@ejemplo.co', nivel: 880, resueltos: 1, fundamentosResueltos: 0, envios: 9, segundosSemana: 0, alertas: ['inactivo'], ultimaActividad: hace(10) },
    { username: 'caro', email: 'c@ejemplo.co', nivel: 1000, resueltos: 0, fundamentosResueltos: 0, envios: 0, segundosSemana: 0, alertas: ['sin-actividad'], ultimaActividad: null },
  ],
  temas: [
    { user_id: 'a', tag: 'graphs', intentos: 4, aciertos: 1 },
    { user_id: 'b', tag: 'graphs', intentos: 4, aciertos: 1 },
    { user_id: 'a', tag: 'strings', intentos: 2, aciertos: 2 },
  ],
  actividad: [{ dia: '2026-11-15', segundos: 1800, estudiantes: 2 }],
  problemas: [{ numero: 7, titulo: 'Graph', titulo_es: 'Grafo', fallos: 5, resolvieron: 1, intentaron: 3 }],
};

Deno.test('datosDelReporte: resumen, semaforo y a quien acompanar', () => {
  const d = datosDelReporte(PANEL, { alerta: (a: string) => a.toUpperCase(), hoy: HOY });
  assertEquals(d.resumen, { estudiantes: 3, activos: 1, nivelPromedio: 1030, resueltos: 13, envios: 39, conAlertas: 2 });
  assertEquals(d.estudiantes.map((e: { nombre: string; estado: string }) => [e.nombre, e.estado]), [['ana', 'al-dia'], ['caro', 'sin-actividad'], ['beto', 'en-riesgo']]);
  assertEquals(d.acompanar.map((a: { nombre: string }) => a.nombre), ['caro', 'beto']);
  assertEquals(d.niveles.map((r: { cantidad: number }) => r.cantidad), [1, 1, 1, 0, 0]);
});

Deno.test('datosDelReporte: temas de mas dificil a mas facil y problemas', () => {
  const d = datosDelReporte(PANEL, { hoy: HOY });
  assertEquals(d.temas.map((t: { tema: string; porcentaje: number }) => [t.tema, t.porcentaje]), [['Grafos', 25], ['Cadenas', 100]]);
  assertEquals(d.problemas[0].problema, '#7 Grafo');
  assertEquals(d.actividad[0].minutos, 30);
});

Deno.test('datosDelReporte: clase vacia no rompe', () => {
  const d = datosDelReporte({ clase: { nombre: 'Vacía' } }, { hoy: HOY });
  assertEquals([d.resumen.estudiantes, d.resumen.nivelPromedio, d.temas.length, d.acompanar.length], [0, 0, 0, 0]);
});

Deno.test('nombre del archivo', () => {
  assertEquals(archivoDelReporte('Maratón 2026 · A', 'pdf', HOY), 'reporte-maraton-2026-a-2026-11-16.pdf');
});
