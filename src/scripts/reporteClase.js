// Reporte CSV de una clase con las mismas columnas de la vista docente (sin fotos ni datos extra).
// Separador ';' y BOM para que Excel en español lo abra con tildes y en columnas.

const BOM = String.fromCharCode(0xfeff);
const COLUMNAS =['Nombre', 'Correo', 'Última actividad', 'Nivel', 'Resueltos', 'Problemas', 'Fundamentos', 'Envíos', 'Minutos esta semana', 'Alertas'];

// Un texto que empieza por = + - @ (o tabulador/retorno) Excel lo ejecuta como fórmula.
const texto = (valor) => {
  const limpio = String(valor ?? '');
  const seguro = /^[\s]*[=+\-@\t\r]/.test(limpio) ? `'${limpio}` : limpio;
  return `"${seguro.replace(/"/g, '""')}"`;
};
const numero = (valor) => String(Number.isFinite(Number(valor)) ? Number(valor) : '');

/** Texto CSV de los estudiantes. `nombre` y `alerta` traducen los datos crudos como en pantalla. */
export const csvDeClase = (estudiantes, { nombre = (n) => n, alerta = (a) => a } = {}) => {
  const filas = estudiantes.map((e) => [
    texto(nombre(e.username)),
    texto(e.email),
    texto(e.ultimaActividad ? new Date(e.ultimaActividad).toISOString().slice(0, 16).replace('T', ' ') : ''),
    numero(Math.round(e.nivel ?? 0)),
    numero((e.resueltos ?? 0) + (e.fundamentosResueltos ?? 0)),
    numero(e.resueltos ?? 0),
    numero(e.fundamentosResueltos ?? 0),
    numero(e.envios ?? 0),
    numero(Math.round((e.segundosSemana ?? 0) / 60)),
    texto((e.alertas ?? []).map(alerta).join(', ')),
  ].join(';'));
  return `${BOM}${[COLUMNAS.map(texto).join(';'), ...filas].join('\r\n')}\r\n`;
};

/** Nombre de archivo seguro: clase-<nombre>-<fecha>.csv */
export const archivoDeClase = (nombreClase, fecha = new Date()) => {
  const base = String(nombreClase ?? 'clase').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'clase';
  return `clase-${base}-${fecha.toISOString().slice(0, 10)}.csv`;
};
