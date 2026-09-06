import { cargarConfig } from '../../supabase/functions/_compartido/config.ts';
import { ejecutar } from '../../supabase/functions/_compartido/judge0.ts';

const config = cargarConfig();
const codigo = await Deno.readTextFile(Deno.args[0]);
const langId = Number(Deno.args[1]);

const casos = [
  { entrada: '4\n1 1\n2 2\n3 3\n4 4\n', esperado: '4' },
  { entrada: '4\n1 2\n2 3\n3 4\n4 1\n', esperado: '0' },
];

for (const [i, c] of casos.entries()) {
  const r = await ejecutar(
    { source_code: codigo, language_id: langId, stdin: c.entrada, expected_output: c.esperado },
    config,
  );
  const d = r.data as Record<string, { id?: number; description?: string } | string | null>;
  const st = d.status as { id?: number; description?: string };
  const salida = String(d.stdout ?? '').trim();
  console.log(`  caso ${i + 1}: ${st?.description}  salida="${salida}"  esperado="${c.esperado}"  ${d.compile_output ? 'COMPILE: ' + d.compile_output : ''}`);
}
