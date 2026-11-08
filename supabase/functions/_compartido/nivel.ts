// Nivel real del estudiante: Elo para sistemas educativos (Pelanek 2016).
// Formula y constantes aprobadas por el equipo el 2026-11-07. Solo funciones puras.

export const NIVEL_INICIAL = 1000;
export const FALLOS_PARA_CERRAR = 5;
export const DIAS_PARA_CERRAR = 7;
const MS_DIA = 86_400_000;

export const esperado = (nivel: number, dificultad: number): number =>
  1 / (1 + 10 ** ((dificultad - nivel) / 400));

/** Rapido al principio (80), 40 a los 10 resultados y 16 desde los 40. */
export const factorK = (resultadosPrevios: number): number =>
  Math.max(16, 80 / (1 + 0.1 * resultadosPrevios));

/** Cuanto pesa un envio fallido. Compilacion y errores del juez no cuentan. */
export const pesoDeFallo = (veredicto: string): number => {
  if (veredicto === 'WRONG_ANSWER' || veredicto === 'RUNTIME_ERROR') return 1;
  if (veredicto === 'TIME_LIMIT_EXCEEDED') return 0.5;
  return 0;
};

/** Aceptado tras f fallos: 1 sin fallos, baja 0,1 por fallo hasta 0,5; con pista previa x0,75. */
export const puntajeAceptado = (fallos: number, conPista: boolean): number =>
  Math.max(0.5, 1 - 0.1 * fallos) * (conPista ? 0.75 : 1);

export interface Envio {
  id: string;
  problemaId: string;
  veredicto: string;
  procesado: Date;
  hashCodigo: string;
  dificultad: number;
}

export interface Pista {
  problemaId: string;
  creada: Date;
}

export interface Resultado {
  problemaId: string;
  envioId: string | null; // null si se cerro por los dias sin aceptado
  aceptado: boolean;
  puntaje: number;
  esperado: number;
  cambio: number;
  nivelDespues: number;
  cerradoEn: Date;
}

interface Abierto {
  fallos: number;
  primerFallo: Date | null;
  hashes: Set<string>;
  dificultad: number;
}

/**
 * Recorre el historial en orden y devuelve el nivel final y un resultado por problema.
 * Determinista: el mismo historial da siempre lo mismo.
 */
export const calcularNivel = (envios: Envio[], pistas: Pista[]) => {
  const orden = [...envios].sort((a, b) => a.procesado.getTime() - b.procesado.getTime());
  const abiertos = new Map<string, Abierto>();
  const cerrados = new Map<string, Resultado>();
  let nivel = NIVEL_INICIAL;

  const cerrar = (
    problemaId: string,
    dificultad: number,
    puntaje: number,
    aceptado: boolean,
    envioId: string | null,
    cuando: Date,
  ) => {
    const e = esperado(nivel, dificultad);
    let cambio = factorK(cerrados.size) * (puntaje - e);
    // Un aceptado nunca baja el nivel.
    if (aceptado && cambio < 0) cambio = 0;
    nivel += cambio;
    cerrados.set(problemaId, {
      problemaId,
      envioId,
      aceptado,
      puntaje,
      esperado: e,
      cambio,
      nivelDespues: nivel,
      cerradoEn: cuando,
    });
    abiertos.delete(problemaId);
  };

  // Antes de cada envio se cierran los problemas con 7 dias desde el primer fallo.
  const cerrarVencidos = (ahora: Date) => {
    for (const [problemaId, a] of [...abiertos]) {
      if (a.primerFallo && ahora.getTime() - a.primerFallo.getTime() >= DIAS_PARA_CERRAR * MS_DIA) {
        const cuando = new Date(a.primerFallo.getTime() + DIAS_PARA_CERRAR * MS_DIA);
        cerrar(problemaId, a.dificultad, 0, false, null, cuando);
      }
    }
  };

  for (const envio of orden) {
    // Un envio cortado por el juez no existe para el nivel: reenviar ese codigo no es repetir.
    if (envio.veredicto === 'PENDING' || envio.veredicto === 'ERROR_JUEZ') continue;
    cerrarVencidos(envio.procesado);
    if (cerrados.has(envio.problemaId)) continue;

    const a = abiertos.get(envio.problemaId) ??
      { fallos: 0, primerFallo: null, hashes: new Set<string>(), dificultad: envio.dificultad };
    abiertos.set(envio.problemaId, a);
    const repetido = a.hashes.has(envio.hashCodigo);
    a.hashes.add(envio.hashCodigo);

    if (envio.veredicto === 'ACCEPTED') {
      const conPista = pistas.some((p) =>
        p.problemaId === envio.problemaId && p.creada.getTime() < envio.procesado.getTime()
      );
      cerrar(
        envio.problemaId,
        a.dificultad,
        puntajeAceptado(a.fallos, conPista),
        true,
        envio.id,
        envio.procesado,
      );
      continue;
    }

    const peso = repetido ? 0 : pesoDeFallo(envio.veredicto);
    if (!peso) continue;
    a.fallos += peso;
    a.primerFallo ??= envio.procesado;
    if (a.fallos >= FALLOS_PARA_CERRAR) {
      cerrar(envio.problemaId, a.dificultad, 0, false, envio.id, envio.procesado);
    }
  }

  return { nivel, resultados: [...cerrados.values()] };
};
