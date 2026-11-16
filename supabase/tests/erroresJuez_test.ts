import { assertEquals } from '@std/assert';
import * as J from '../../src/scripts/erroresJuez.js';

// deno-lint-ignore no-explicit-any
const { explicarEnvio, mensajeDelJuez } = J as any;

Deno.test('explicarEnvio: aceptado y veredictos desconocidos no se explican', () => {
  assertEquals(explicarEnvio({ verdict: 'ACCEPTED' }), null);
  assertEquals(explicarEnvio({ verdict: 'PENDING' }), null);
  assertEquals(explicarEnvio(null), null);
});

Deno.test('explicarEnvio: reconoce errores comunes por lenguaje', () => {
  const cpp = explicarEnvio({ verdict: 'COMPILATION_ERROR', compile_output: "main.cpp: In function 'int main()':\nmain.cpp:6:5: error: expected ';' before 'return'\n    ^" });
  assertEquals([cpp.titulo, cpp.texto.startsWith('Falta un punto y coma'), cpp.oficial], ['Error de compilación', true, "main.cpp:6:5: error: expected ';' before 'return'"]);
  // Compilación: nunca "en el caso N".
  assertEquals(explicarEnvio({ verdict: 'COMPILATION_ERROR', compile_output: 'x', casoFallido: 1 }).titulo, 'Error de compilación');
  assertEquals(explicarEnvio({ verdict: 'COMPILATION_ERROR', compile_output: 'IndentationError: unexpected indent' }).texto.startsWith('Error de sangría'), true);
  assertEquals(explicarEnvio({ verdict: 'COMPILATION_ERROR', compile_output: 'Main.java:3: error: cannot find symbol' }).texto.startsWith('Usas un nombre'), true);
  const py = explicarEnvio({ verdict: 'RUNTIME_ERROR', stderr: 'Traceback...\nIndexError: list index out of range', casoFallido: 3 });
  assertEquals([py.titulo, py.texto.startsWith('Accediste a una posición'), py.oficial], ['Error de ejecución en el caso 3', true, 'IndexError: list index out of range']);
});

Deno.test('explicarEnvio: sin patron conocido usa la explicacion general', () => {
  const wa = explicarEnvio({ verdict: 'WRONG_ANSWER', casoFallido: 2, stdout: '5' });
  assertEquals([wa.titulo, wa.texto.startsWith('Tu programa terminó'), wa.oficial], ['Respuesta incorrecta en el caso 2', true, '']);
  assertEquals(explicarEnvio({ verdict: 'TIME_LIMIT_EXCEEDED' }).texto.includes('10⁸'), true);
  assertEquals(mensajeDelJuez({ stderr: '  boom  ' }), 'boom');
});
