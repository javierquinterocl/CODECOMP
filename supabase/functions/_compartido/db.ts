

import postgres from 'npm:postgres@3.4.5';

let sql: ReturnType<typeof postgres> | null = null;

export const conexion = (databaseUrl: string) => {
  if (!databaseUrl) throw new Error('DATABASE_URL no esta configurada.');
  if (!sql) {
    sql = postgres(databaseUrl, {
      max: 1,
      prepare: false,
      idle_timeout: 20,
      connect_timeout: 10,
    });
  }
  return sql;
};

export type Sql = ReturnType<typeof postgres>;
