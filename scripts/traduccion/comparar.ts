// Genera un HTML con el ingles y el espanol de un lote lado a lado.

import { CARPETA, leerLote, rutas } from './formato.ts';
import { traduccionesDe, validarLote } from './validar.ts';

const escapar = (texto: string): string =>
  texto.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const i = Deno.args.indexOf('--lote');
const id = i === -1 ? 'muestra' : Deno.args[i + 1];
const originales = leerLote(await Deno.readTextFile(rutas(id).lote));
const traducciones = await traduccionesDe(id);
const informe = await validarLote(id);

const filas = originales.map((en) => {
  const es = traducciones.get(en.numero);
  const v = informe.problemas[en.numero];
  const notas = [...v.errores.map((x) => `Error: ${x}`), ...v.avisos.map((x) => `Aviso: ${x}`)];
  return `
  <section class="${v.estado}">
    <header>
      <strong>#${en.numero}</strong>
      <span>${v.estado === 'ok' ? 'validado' : 'FALLA'} · ${en.enunciado.length} caracteres</span>
      ${en.literales.length ? `<span>literales: ${escapar(en.literales.join(' | '))}</span>` : ''}
    </header>
    ${notas.length ? `<ul>${notas.map((n) => `<li>${escapar(n)}</li>`).join('')}</ul>` : ''}
    <div class="par">
      <div><h2>${escapar(en.titulo)}</h2><pre>${escapar(en.enunciado)}</pre></div>
      <div><h2>${escapar(es?.titulo ?? '')}</h2><pre>${escapar(es?.enunciado ?? '')}</pre></div>
    </div>
  </section>`;
});

const html = `<!doctype html>
<html lang="es"><head><meta charset="utf-8">
<title>Traduccion · lote ${id}</title>
<style>
  body { font-family: system-ui, sans-serif; margin: 24px; background: #f4f4f4; color: #111; }
  section { background: #fff; border: 2px solid #000; margin-bottom: 24px; }
  section.fallo { border-color: #B00020; }
  header { display: flex; gap: 16px; flex-wrap: wrap; padding: 8px 12px; border-bottom: 2px solid #000; }
  section.fallo header { background: #B00020; color: #fff; }
  ul { margin: 8px 12px; color: #B00020; }
  .par { display: grid; grid-template-columns: 1fr 1fr; }
  .par > div { padding: 12px; min-width: 0; }
  .par > div + div { border-left: 2px solid #000; }
  h2 { font-size: 16px; margin: 0 0 8px; }
  pre { white-space: pre-wrap; word-break: break-word; font: 14px/1.5 system-ui, sans-serif; margin: 0; }
</style></head><body>
<h1>Lote ${id}: ingles y espanol</h1>
<p>El texto se muestra tal como se guarda en la base, con su marcado (*n*, &lt;=, $...$).</p>
${filas.join('\n')}
</body></html>`;

const salida = `${CARPETA}/${id === 'muestra' ? 'muestra' : `lote-${id}`}.html`;
await Deno.writeTextFile(salida, html);
console.log(`Escrito ${salida}`);
