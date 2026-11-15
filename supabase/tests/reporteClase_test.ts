import { assertEquals } from '@std/assert';
import { archivoDeClase, csvDeClase } from '../../src/scripts/reporteClase.js';

const estudiante = {
  username: '=HYPERLINK("x")', email: 'ana@ejemplo.com', ultimaActividad: '2026-11-15T14:30:00Z',
  nivel: 1234.6, resueltos: 3, fundamentosResueltos: 2, envios: 9, segundosSemana: 3600, alertas: ['inactivo'],
};

Deno.test('csvDeClase: cabecera, BOM, numeros y formulas neutralizadas', () => {
  const lineas = csvDeClase([estudiante], { alerta: (a: string) => a.toUpperCase() }).split('\r\n');
  assertEquals(lineas[0].charCodeAt(0), 0xfeff);
  assertEquals(lineas[0].slice(1).startsWith('"Nombre";"Correo"'), true);
  assertEquals(
    lineas[1],
    `"'=HYPERLINK(""x"")";"ana@ejemplo.com";"2026-11-15 14:30";1235;5;3;2;9;60;"INACTIVO"`,
  );
});

Deno.test('csvDeClase: neutraliza formulas tras espacios y deja comillas y saltos dentro de la celda', () => {
  const linea = csvDeClase([{ ...estudiante, username: '  +1', email: 'a"b\nc', alertas: [] }]).split('\r\n')[1];
  assertEquals(linea.startsWith(`"'  +1";"a""b\nc"`), true);
});

Deno.test('archivoDeClase: nombre sin tildes ni simbolos', () => {
  assertEquals(archivoDeClase('Maratón 2026 · Grupo A', new Date('2026-11-15T12:00:00Z')), 'clase-maraton-2026-grupo-a-2026-11-15.csv');
});
