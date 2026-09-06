// Comprueba que el front sigue clasificando bien con el payload nuevo.
const B = 'https://avzbnvmesyhysxsdauaa.supabase.co/functions/v1/api';
const t0 = performance.now();
const r1 = await fetch(`${B}/problems`);
const d = await r1.json();
const t1 = performance.now();
const r2 = await fetch(`${B}/problems`);
await r2.arrayBuffer();
const t2 = performance.now();

const { categoriaDeProblema } = await import('../../src/scripts/problemsData.js');
const cuenta: Record<string, number> = {};
for (const p of d.problems) {
  const c = categoriaDeProblema({ tags: p.tags, dificultadRating: p.difficulty_rating });
  cuenta[c] = (cuenta[c] ?? 0) + 1;
}
console.log('  reparto con el payload nuevo (tags como texto):');
for (const [k, v] of Object.entries(cuenta).sort((a, b) => b[1] - a[1])) {
  console.log(`    ${k.padEnd(22)} ${String(v).padStart(5)}`);
}
console.log(`\n  1a peticion: ${(t1 - t0).toFixed(0)} ms`);
console.log(`  2a peticion: ${(t2 - t1).toFixed(0)} ms  (efecto del Cache-Control en el CDN)`);
