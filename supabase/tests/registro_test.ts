import { assertEquals, assertMatch } from '@std/assert';
import { esDocente } from '../functions/_compartido/auth.ts';
import {
  MAX_SEGUNDOS_POR_RESUMEN,
  normalizarCodigo,
  normalizarNombreClase,
  nuevoCodigoClase,
  validarResumen,
} from '../functions/_compartido/registro.ts';

const DOCENTES = new Set(['profe@ufpso.edu.co']);
const identidad = (email: string | null, emailVerificado: boolean) => ({
  uid: 'u1',
  email,
  nombre: null,
  emailVerificado,
});

Deno.test('esDocente exige correo de la lista y verificado, sin importar mayusculas', () => {
  assertEquals(esDocente(identidad('Profe@UFPSO.edu.co', true), DOCENTES), true);
  assertEquals(esDocente(identidad('profe@ufpso.edu.co', false), DOCENTES), false);
  assertEquals(esDocente(identidad('otro@ufpso.edu.co', true), DOCENTES), false);
  assertEquals(esDocente(identidad(null, true), DOCENTES), false);
  assertEquals(esDocente(null, DOCENTES), false);
});

Deno.test('validarResumen acepta enteros en rango y rechaza lo demas', () => {
  assertEquals(validarResumen({ segundos: 300 }), { segundos: 300, pegados: 0, caracteres: 0, ejercicios: [] });
  assertEquals(
    validarResumen({ segundos: 0, pegados: 2, caracteres_pegados: 140 }),
    { segundos: 0, pegados: 2, caracteres: 140, ejercicios: [] },
  );
  assertEquals(validarResumen({ segundos: MAX_SEGUNDOS_POR_RESUMEN + 1 }), null);
  assertEquals(validarResumen({ segundos: -1 }), null);
  assertEquals(validarResumen({ segundos: 1.5 }), null);
  assertEquals(validarResumen({ segundos: '300' }), null);
  assertEquals(validarResumen({ segundos: 10, pegados: -3 }), null);
  assertEquals(validarResumen(null), null);
});

Deno.test('los codigos de clase tienen 6 caracteres sin letras confusas', () => {
  for (let i = 0; i < 200; i++) assertMatch(nuevoCodigoClase(), /^[A-HJ-NP-Z2-9]{6}$/);
});

Deno.test('normalizarCodigo y normalizarNombreClase limpian la entrada', () => {
  assertEquals(normalizarCodigo(' abc234 '), 'ABC234');
  assertEquals(normalizarCodigo('ABC23'), null);
  assertEquals(normalizarCodigo('ABC-234'), null);
  assertEquals(normalizarCodigo(123456), null);
  assertEquals(normalizarNombreClase('  Maraton   2026-2 '), 'Maraton 2026-2');
  assertEquals(normalizarNombreClase('ab'), null);
  assertEquals(normalizarNombreClase('x'.repeat(81)), null);
});
