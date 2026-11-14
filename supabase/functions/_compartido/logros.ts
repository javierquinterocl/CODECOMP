// Logros por hitos, calculados con datos que ya existen. Los textos viven en el frontend
// (src/scripts/logros.js); aqui solo el id, el avance y la meta. Umbrales: borrador del equipo.

export interface DatosLogros {
  resueltos: number;
  rachaMaxima: number;
  /** Escalon ganado por merito: max(por nivel, por resueltos), sin el piso del docente. */
  escalonMerito: number;
  fundamentos: { hechos: number; total: number };
  practica: { hechos: number; total: number };
  competenciasEmpezadas: number;
}

export interface Logro {
  id: string;
  actual: number;
  meta: number;
  conseguido: boolean;
}

type Definicion = [id: string, actual: (d: DatosLogros) => number, meta: (d: DatosLogros) => number];

const fija = (n: number) => () => n;

const DEFINICIONES: Definicion[] = [
  ['primer-paso', (d) => d.resueltos, fija(1)],
  ['en-marcha', (d) => d.resueltos, fija(10)],
  ['medio-centenar', (d) => d.resueltos, fija(50)],
  ['centenar', (d) => d.resueltos, fija(100)],
  ['constancia', (d) => d.rachaMaxima, fija(7)],
  ['imparable', (d) => d.rachaMaxima, fija(30)],
  ['escalador', (d) => d.escalonMerito, fija(3)],
  ['cima', (d) => d.escalonMerito, fija(5)],
  ['fundamentos', (d) => d.fundamentos.hechos, (d) => d.fundamentos.total],
  ['practica', (d) => d.practica.hechos, (d) => d.practica.total],
  ['competidor', (d) => d.competenciasEmpezadas, fija(1)],
];

export const logrosDe = (d: DatosLogros): Logro[] =>
  DEFINICIONES.map(([id, actualDe, metaDe]) => {
    const total = metaDe(d);
    const meta = Math.max(1, total);
    const actual = Math.min(Math.max(0, actualDe(d)), meta);
    // Un nivel sin ejercicios cargados no se puede completar.
    return { id, actual, meta, conseguido: total > 0 && actual >= meta };
  });
