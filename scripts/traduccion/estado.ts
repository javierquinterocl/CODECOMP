// Estado de la traduccion a partir de los archivos: lotes hechos, fallidos y pendientes.

import { CARPETA, rutas } from './formato.ts';

export interface InformeLote {
  lote: string;
  total: number;
  problemas: Record<string, {
    estado: 'ok' | 'fallo';
    origen: 'traductor' | 'revisor';
    errores: string[];
    avisos: string[];
  }>;
}

const existe = async (ruta: string): Promise<boolean> => {
  try {
    await Deno.stat(ruta);
    return true;
  } catch {
    return false;
  }
};

export const idsDeLotes = async (): Promise<string[]> => {
  const ids: string[] = [];
  try {
    for await (const entrada of Deno.readDir(`${CARPETA}/lotes`)) {
      const m = entrada.name.match(/^lote-(\d{3})\.txt$/);
      if (m) ids.push(m[1]);
    }
  } catch {
    // Sin carpeta todavia no hay lotes.
  }
  return ids.sort();
};

export const leerInforme = async (id: string): Promise<InformeLote | null> => {
  try {
    return JSON.parse(await Deno.readTextFile(rutas(id).validacion));
  } catch {
    return null;
  }
};

export const calcularEstado = async () => {
  const pendientes: string[] = [];
  const sinValidar: string[] = [];
  const porRevisar: string[] = [];
  const completos: string[] = [];
  const conRechazados: string[] = [];
  const rechazados: number[] = [];
  let problemas = 0, traducidos = 0, corregidos = 0, avisos = 0;

  for (const id of await idsDeLotes()) {
    const r = rutas(id);
    if (!(await existe(r.es))) {
      pendientes.push(id);
      continue;
    }
    const informe = await leerInforme(id);
    if (!informe) {
      sinValidar.push(id);
      continue;
    }
    problemas += informe.total;
    const filas = Object.entries(informe.problemas);
    const fallos = filas.filter(([, p]) => p.estado === 'fallo').map(([n]) => Number(n));
    traducidos += filas.length - fallos.length;
    corregidos += filas.filter(([, p]) => p.estado === 'ok' && p.origen === 'revisor').length;
    avisos += filas.filter(([, p]) => p.avisos.length).length;

    if (!fallos.length) completos.push(id);
    else if (await existe(r.rev)) {
      conRechazados.push(id);
      rechazados.push(...fallos);
    } else porRevisar.push(id);
  }

  return {
    lotes: (await idsDeLotes()).length,
    pendientes,
    sinValidar,
    porRevisar,
    completos,
    conRechazados,
    rechazados,
    problemas,
    traducidos,
    corregidos,
    avisos,
  };
};

export const escribirResumen = async (): Promise<void> => {
  const e = await calcularEstado();
  const lista = (ids: (string | number)[]) => (ids.length ? ids.join(', ') : 'ninguno');
  const lineas = [
    '# Resumen de la traduccion',
    '',
    `Actualizado: ${new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' })}`,
    '',
    `- Lotes: ${e.lotes}`,
    `- Completos (todo validado): ${e.completos.length}`,
    `- Con fallidos, esperan al revisor: ${e.porRevisar.length} (${lista(e.porRevisar)})`,
    `- Con rechazados tras la revision: ${e.conRechazados.length} (${lista(e.conRechazados)})`,
    `- Traducidos sin validar: ${e.sinValidar.length} (${lista(e.sinValidar)})`,
    `- Pendientes de traducir: ${e.pendientes.length} (${lista(e.pendientes)})`,
    '',
    `- Problemas validados: ${e.traducidos} de ${e.problemas} procesados`,
    `- De ellos, corregidos por el revisor: ${e.corregidos}`,
    `- Con avisos (comillas traducidas): ${e.avisos}`,
    `- Rechazados (quedan sin traduccion): ${e.rechazados.length} (${lista(e.rechazados)})`,
    '',
  ];
  await Deno.writeTextFile(`${CARPETA}/resumen.md`, lineas.join('\n'));
};

if (import.meta.main) {
  await escribirResumen();
  const estado = await calcularEstado();
  if (Deno.args.includes('--json')) console.log(JSON.stringify(estado));
  else console.log(await Deno.readTextFile(`${CARPETA}/resumen.md`));
}
