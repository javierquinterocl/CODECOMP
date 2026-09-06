import type { Config } from './config.ts';
import type { Sql } from './db.ts';
import type { Identidad } from './auth.ts';

export interface Contexto {
  req: Request;
  url: URL;
  sql: Sql;
  config: Config;
  cors: Record<string, string>;
  // null si no hay token o no verifica. Cada ruta decide si lo exige.
  identidad: Identidad | null;
}

export type Ruta = (ctx: Contexto) => Promise<Response>;
