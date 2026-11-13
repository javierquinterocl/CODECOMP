// Juez de PSeInt: invoca la Lambda con el interprete oficial y compara su salida con los ejemplos.

import { AwsClient } from 'npm:aws4fetch@1.0.20';
import type { Config } from './config.ts';

export interface Ejemplo {
  entrada: string;
  salida: string;
}

// Lo que devuelve la Lambda por cada entrada (aws/pseint/manejador.py).
export interface Ejecucion {
  salida: string;
  estado: 'ok' | 'tiempo' | 'salida' | 'fallo';
}

export type Lectura =
  | { tipo: 'ok'; salida: string }
  | { tipo: 'error'; salida: string; linea: number; numero: number | null; mensaje: string }
  | { tipo: 'sin-datos'; salida: string; linea: number };

export type Veredicto =
  | { veredicto: 'ACEPTADO'; ejemplos: number }
  | {
    veredicto: 'INCORRECTO';
    ejemplo: number;
    entrada: string;
    esperada: string;
    obtenida: string;
  }
  | { veredicto: 'ERROR'; ejemplo: number; linea: number; numero: number | null; mensaje: string }
  | { veredicto: 'SIN_DATOS'; ejemplo: number; linea: number }
  | { veredicto: 'NO_TERMINA' | 'DEMASIADA_SALIDA' | 'FALLO'; ejemplo: number };

// Marca que PSeInt pone antes de cada E/S (p) y de cada error (e) con --withioreferences.
const MARCA = /\x1b\[z([pe])(\d+):\d+;/;
const AVISOS_DE_PRUEBA = /^\*\*\*(LimpiarPantalla|EsperarTecla|Esperar\d+)\*\*\*\n/gm;
const ERROR = /^Lin (\d+)(?: \(inst \d+\))?: ERROR (\d+): ([^\n]*)/;
const TOPE_MOSTRADO = 2000;
const TOPE_MENSAJE = 300;

// Quita el "> dato" que escribe cada Leer y separa los errores del interprete.
export const interpretarSalida = (crudo: string, entrada: string): Lectura => {
  const datos = entrada.replace(/\r/g, '').split('\n');
  if (datos.at(-1) === '') datos.pop();
  const partes = crudo.split(new RegExp(MARCA.source, 'g'));
  let salida = partes[0];
  let leidos = 0;

  for (let i = 1; i < partes.length; i += 3) {
    const clase = partes[i];
    const linea = Number(partes[i + 1]);
    const texto = partes[i + 2];
    if (clase === 'e') {
      const m = ERROR.exec(texto);
      const mensaje = ocultarCredenciales((m ? m[3] : texto).trim()).slice(0, TOPE_MENSAJE);
      return m
        ? { tipo: 'error', salida, linea: Number(m[1]), numero: Number(m[2]), mensaje }
        : { tipo: 'error', salida, linea, numero: null, mensaje };
    }
    if (texto.startsWith('> <<No hay m')) return { tipo: 'sin-datos', salida, linea };
    const eco = `> ${datos[leidos]}\n`;
    if (leidos < datos.length && texto.startsWith(eco)) {
      leidos++;
      salida += texto.slice(eco.length);
    } else {
      salida += texto;
    }
  }
  return { tipo: 'ok', salida: salida.replace(AVISOS_DE_PRUEBA, '') };
};

// Nada con forma de credencial de AWS vuelve al navegador: el proceso puede leer las del rol.
// Un tramo largo solo se tapa si mezcla mayusculas, minusculas y digitos (no "=====...").
const CREDENCIALES = /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b|[A-Za-z0-9/+=]{40,}/g;
const MEZCLA = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)/;
export const ocultarCredenciales = (texto: string): string =>
  texto.replace(CREDENCIALES, (t) => (/^A[SK]IA/.test(t) || MEZCLA.test(t) ? '[oculto]' : t));

// Sin espacios al final de cada linea ni lineas vacias al final.
export const normalizar = (texto: string): string =>
  texto.replace(/\r\n?/g, '\n').split('\n').map((l) => l.replace(/[ \t]+$/, '')).join('\n')
    .replace(/\n+$/, '');

// Fallo en un caso oculto: solo lo que habla del codigo del estudiante, nada del caso.
export type FalloOculto =
  | { veredicto: 'INCORRECTO' | 'NO_TERMINA' | 'DEMASIADA_SALIDA' | 'FALLO'; oculto: true; ejemplo: number }
  | { veredicto: 'ERROR'; oculto: true; ejemplo: number; linea: number; numero: number | null }
  | { veredicto: 'SIN_DATOS'; oculto: true; ejemplo: number; linea: number };

// Los casos desde `visibles` son ocultos: su fallo no lleva entrada, salidas ni mensaje.
export const juzgar = (
  ejemplos: Ejemplo[],
  ejecuciones: Ejecucion[],
  visibles = ejemplos.length,
): Veredicto | FalloOculto => {
  for (const [i, ejemplo] of ejemplos.entries()) {
    const n = i + 1;
    const ejecucion = ejecuciones[i];
    const oculto = i >= visibles;
    const corte = (veredicto: 'NO_TERMINA' | 'DEMASIADA_SALIDA' | 'FALLO') =>
      oculto ? { veredicto, oculto, ejemplo: n } as const : { veredicto, ejemplo: n };
    if (!ejecucion) return corte('FALLO');
    if (ejecucion.estado === 'tiempo') return corte('NO_TERMINA');
    if (ejecucion.estado === 'salida') return corte('DEMASIADA_SALIDA');
    if (ejecucion.estado !== 'ok') return corte('FALLO');

    const lectura = interpretarSalida(ejecucion.salida, ejemplo.entrada);
    if (lectura.tipo === 'error') {
      const { linea, numero, mensaje } = lectura;
      return oculto
        ? { veredicto: 'ERROR', oculto, ejemplo: n, linea, numero }
        : { veredicto: 'ERROR', ejemplo: n, linea, numero, mensaje };
    }
    if (lectura.tipo === 'sin-datos') {
      return oculto
        ? { veredicto: 'SIN_DATOS', oculto, ejemplo: n, linea: lectura.linea }
        : { veredicto: 'SIN_DATOS', ejemplo: n, linea: lectura.linea };
    }
    if (normalizar(lectura.salida) !== normalizar(ejemplo.salida)) {
      if (oculto) return { veredicto: 'INCORRECTO', oculto, ejemplo: n };
      return {
        veredicto: 'INCORRECTO',
        ejemplo: n,
        entrada: ejemplo.entrada,
        esperada: ejemplo.salida,
        obtenida: ocultarCredenciales(lectura.salida).slice(0, TOPE_MOSTRADO),
      };
    }
  }
  return { veredicto: 'ACEPTADO', ejemplos: ejemplos.length };
};

// Lo que ve el estudiante: el numero de un caso oculto se queda en la base.
export const paraNavegador = (r: Veredicto | FalloOculto) => {
  if (!('oculto' in r)) return r;
  const { ejemplo: _ejemplo, ...resto } = r;
  return resto;
};

const TOPE_DETALLE = 2000;
// Contexto para la pista de IA. Nunca hay detalle de un caso oculto.
export const detalleDe = (r: Veredicto | FalloOculto): string | null => {
  if ('oculto' in r) return null;
  if (r.veredicto === 'INCORRECTO') return r.obtenida.slice(0, TOPE_DETALLE);
  if (r.veredicto === 'ERROR') return `linea ${r.linea}: ${r.mensaje}`.slice(0, TOPE_DETALLE);
  return null;
};

export type Invocador = (codigo: string, entradas: string[]) => Promise<Ejecucion[]>;

// Esperas ante un 429 por simultaneidad: Lambda lo rechazo sin ejecutar nada.
const ESPERAS_SATURADA = [250, 500, 1000, 2000];
// Lo que puede tardar la Lambda (plazo total de 7 s y arranque): sin ese margen no se reintenta.
const MARGEN_LAMBDA_MS = 8000;
const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Llama a la API Invoke de Lambda firmada con la llave que solo puede invocar esa funcion.
export const invocadorLambda = (config: Config): Invocador => {
  const cliente = new AwsClient({
    accessKeyId: config.pseintAccessKeyId,
    secretAccessKey: config.pseintSecretAccessKey,
    region: config.pseintRegion,
    service: 'lambda',
    // Sin reintentos: cada uno volveria a ejecutar el codigo del estudiante.
    retries: 0,
  });
  const url = `https://lambda.${config.pseintRegion}.amazonaws.com/2015-03-31/functions/` +
    `${encodeURIComponent(config.pseintFuncion)}/invocations`;

  return async (codigo, entradas) => {
    const corte = new AbortController();
    const alarma = setTimeout(() => corte.abort(), config.pseintTimeoutMs);
    const limite = Date.now() + config.pseintTimeoutMs;
    try {
      const cuerpoPeticion = JSON.stringify({ codigo, entradas });
      let res = await cliente.fetch(url, {
        method: 'POST',
        body: cuerpoPeticion,
        signal: corte.signal,
      });
      // Solo se reintenta la saturacion: cualquier otro error pudo haber ejecutado el codigo.
      for (const espera of ESPERAS_SATURADA) {
        const pausa = espera + Math.random() * espera;
        if (res.status !== 429 || limite - Date.now() - pausa < MARGEN_LAMBDA_MS) break;
        await res.body?.cancel();
        await dormir(pausa);
        res = await cliente.fetch(url, {
          method: 'POST',
          body: cuerpoPeticion,
          signal: corte.signal,
        });
      }
      const cuerpo = await res.json().catch(() => null);
      if (
        !res.ok || res.headers.get('x-amz-function-error') || !Array.isArray(cuerpo?.resultados)
      ) {
        throw new Error(`Lambda respondio ${res.status}: ${JSON.stringify(cuerpo)?.slice(0, 200)}`);
      }
      return cuerpo.resultados as Ejecucion[];
    } finally {
      clearTimeout(alarma);
    }
  };
};
