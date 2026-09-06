// Comprueba que la clave de RapidAPI funciona y que el juez responde.
import { cargarConfig } from '../../supabase/functions/_compartido/config.ts';
import { ejecutar } from '../../supabase/functions/_compartido/judge0.ts';

const config = cargarConfig();
console.log('modo        :', config.modo);
console.log('url         :', config.judge0Url);
console.log('clave puesta:', config.rapidApiKey ? `si (${config.rapidApiKey.length} caracteres)` : 'NO');
console.log('topes       :', config.maxDiario, 'dia /', config.maxMensual, 'mes');
console.log('zona horaria:', config.zonaHoraria);
console.log('lenguajes   :', [...config.lenguajesPermitidos].join(', '));
console.log('origenes    :', config.origenesPermitidos.join(', ') || '(cualquiera)');
console.log('\nEnviando un hola-mundo en Python al juez...\n');

const r = await ejecutar(
  { source_code: 'print(sum(map(int, input().split())))', language_id: 71, stdin: '2 3', expected_output: '5' },
  config,
);
const d = r.data as Record<string, unknown>;
console.log('  HTTP    :', r.status, r.ok ? '(ok)' : '(fallo)');
console.log('  status  :', JSON.stringify(d.status));
console.log('  stdout  :', JSON.stringify(d.stdout));
console.log('  stderr  :', JSON.stringify(d.stderr));
console.log('  compile :', JSON.stringify(d.compile_output));
console.log('  tiempo  :', d.time, 's | memoria:', d.memory, 'KB');
