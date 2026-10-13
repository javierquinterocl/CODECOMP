// Valida la traduccion de un lote contra su original y deja el informe en validacion/.

import { CARPETA, leerLote, type Problema, rutas, validar } from './formato.ts';
import { escribirResumen, type InformeLote } from './estado.ts';

const leerSiExiste = async (ruta: string): Promise<Problema[] | null> => {
  try {
    return leerLote(await Deno.readTextFile(ruta));
  } catch {
    return null;
  }
};

export const validarLote = async (id: string): Promise<InformeLote> => {
  const r = rutas(id);
  const originales = leerLote(await Deno.readTextFile(r.lote));
  const traducidos = await leerSiExiste(r.es);
  if (!traducidos) throw new Error(`No existe ${r.es}`);
  const revisados = (await leerSiExiste(r.rev)) ?? [];

  const deTraductor = new Map(traducidos.map((p) => [p.numero, p]));
  const deRevisor = new Map(revisados.map((p) => [p.numero, p]));

  const informe: InformeLote = { lote: id, total: originales.length, problemas: {} };
  for (const en of originales) {
    const revisado = deRevisor.get(en.numero);
    const veredicto = validar(en, revisado ?? deTraductor.get(en.numero));
    informe.problemas[en.numero] = {
      estado: veredicto.errores.length ? 'fallo' : 'ok',
      origen: revisado ? 'revisor' : 'traductor',
      ...veredicto,
    };
  }

  await Deno.mkdir(`${CARPETA}/validacion`, { recursive: true });
  await Deno.writeTextFile(r.validacion, JSON.stringify(informe, null, 2));
  return informe;
};

// La version vigente de cada problema: la del revisor si existe, si no la del traductor.
export const traduccionesDe = async (id: string): Promise<Map<number, Problema>> => {
  const r = rutas(id);
  const vigentes = new Map((await leerSiExiste(r.es) ?? []).map((p) => [p.numero, p]));
  for (const p of (await leerSiExiste(r.rev)) ?? []) vigentes.set(p.numero, p);
  return vigentes;
};

if (import.meta.main) {
  const i = Deno.args.indexOf('--lote');
  const id = i === -1 ? '' : Deno.args[i + 1];
  if (!id) {
    console.error('Uso: validar.ts --lote NNN');
    Deno.exit(1);
  }
  const informe = await validarLote(id);
  if (id !== 'muestra') await escribirResumen();

  const fallos = Object.entries(informe.problemas).filter(([, p]) => p.estado === 'fallo');
  console.log(`Lote ${id}: ${informe.total - fallos.length} de ${informe.total} validados.`);
  for (const [numero, p] of fallos) console.log(`  ${numero}: ${p.errores.join('; ')}`);
}
