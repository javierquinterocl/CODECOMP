import { assertEquals } from '@std/assert';
import {
  errorDeCodigo,
  errorDeConfirmacion,
  errorDeContrasena,
  errorDeCorreo,
  errorDeNombre,
  erroresDe,
  requisitosContrasena,
} from '../../src/scripts/validaciones.js';

Deno.test('requisitosContrasena marca cada requisito por separado', () => {
  const cumple = (p: string) => requisitosContrasena(p).map((r: { cumple: boolean }) => r.cumple);
  assertEquals(cumple(''), [false, false, false, false, false]);
  assertEquals(cumple('abcdefghij'), [true, false, true, false, false]);
  assertEquals(cumple('Abcdefgh1!'), [true, true, true, true, true]);
  assertEquals(errorDeContrasena('Abcdefgh1!'), null);
  assertEquals(String(errorDeContrasena('abc')).includes('al menos 10 caracteres'), true);
  assertEquals(errorDeContrasena(''), 'Escribe una contraseña nueva.');
});

Deno.test('correo, nombre, confirmacion y codigo dicen que poner', () => {
  assertEquals(errorDeCorreo('ana@ufpso.edu.co'), null);
  assertEquals(String(errorDeCorreo('')).includes('nombre@ufpso.edu.co'), true);
  assertEquals(String(errorDeCorreo('ana@ufpso')).includes('no parece válido'), true);
  assertEquals(errorDeNombre('  '), 'Escribe tu nombre, por ejemplo «Ana».');
  assertEquals(errorDeNombre('x'.repeat(51), 'apellido'), 'Tu apellido puede tener hasta 50 caracteres.');
  assertEquals(errorDeConfirmacion('a', 'b'), 'Las dos contraseñas no coinciden: escríbelas igual.');
  assertEquals(errorDeCodigo('1191000'), null);
  assertEquals(String(errorDeCodigo('12345')).includes('llevas 5'), true);
});

Deno.test('erroresDe solo devuelve los campos con error', () => {
  const errores = erroresDe({ correo: 'mal', nombre: 'Ana' }, { correo: errorDeCorreo, nombre: errorDeNombre });
  assertEquals(Object.keys(errores), ['correo']);
});
