// Unico punto donde se leen variables de entorno.

const num = (valor: string | undefined, porDefecto: number): number => {
  const n = Number(valor);
  return Number.isFinite(n) && n > 0 ? n : porDefecto;
};

const env = (clave: string): string | undefined => Deno.env.get(clave);

const enteros = (valor: string | undefined, porDefecto: number[]): Set<number> => {
  const lista = (valor ?? '')
    .split(',')
    .map((x) => Number(x.trim()))
    .filter((n) => Number.isInteger(n) && n > 0);
  return new Set(lista.length ? lista : porDefecto);
};

export interface Config {
  modo: string;
  judge0Url: string;
  rapidApiKey: string;
  judge0Token: string;
  firebaseProjectId: string;
  databaseUrl: string;
  maxDiario: number;
  maxMensual: number;
  timeoutMs: number;
  deadlineMs: number;
  maxCasosPorEnvio: number;
  maxCodigoBytes: number;
  maxEntradaBytes: number;
  origenesPermitidos: string[];
  zonaHoraria: string;
  lenguajesPermitidos: Set<number>;
}

export const cargarConfig = (): Config => ({
  // 'rapidapi' hoy; 'directo' cuando Judge0 sea nuestro.
  modo: env('JUDGE0_MODO') ?? 'rapidapi',
  judge0Url: env('JUDGE0_URL') ?? 'https://judge0-ce.p.rapidapi.com',
  rapidApiKey: env('RAPIDAPI_KEY') ?? '',
  judge0Token: env('JUDGE0_AUTH_TOKEN') ?? '',
  firebaseProjectId: env('FIREBASE_PROJECT_ID') ?? '',
  databaseUrl: env('DATABASE_URL') ?? '',

  maxDiario: num(env('JUDGE0_MAX_DIARIO'), 400),
  maxMensual: num(env('JUDGE0_MAX_MENSUAL'), 4000),

  timeoutMs: num(env('JUDGE0_TIMEOUT_MS'), 15000),

  // Cortar antes de que la plataforma mate la funcion y deje el envio en PENDING.
  deadlineMs: num(env('EVALUACION_DEADLINE_MS'), 100000),
  maxCasosPorEnvio: num(env('MAX_CASOS_POR_ENVIO'), 25),

  maxCodigoBytes: num(env('MAX_CODIGO_BYTES'), 64 * 1024),
  maxEntradaBytes: num(env('MAX_ENTRADA_BYTES'), 64 * 1024),

  origenesPermitidos: (env('ALLOWED_ORIGINS') ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),

  zonaHoraria: env('ZONA_HORARIA') ?? 'America/Bogota',

  // 51 C#, 54 C++, 62 Java, 63 JavaScript, 68 PHP, 71 Python.
  lenguajesPermitidos: enteros(env('JUDGE0_LENGUAJES'), [51, 54, 62, 63, 68, 71]),
});

// En zona horaria del proyecto, no UTC: si no, el tope se reinicia a las 7pm.
export const dia = (zonaHoraria: string, ahora: Date = new Date()): string =>
  ahora.toLocaleDateString('en-CA', { timeZone: zonaHoraria });

export const mes = (zonaHoraria: string, ahora: Date = new Date()): string =>
  dia(zonaHoraria, ahora).slice(0, 7);
