// Reporte de la clase en Excel con el diseño de CODECOMP: hojas Resumen, Estudiantes, Temas,
// Actividad, Problemas y Acompañar, con encabezados azules, semáforo y barras de datos.
// exceljs se carga solo al pulsar el botón (import dinámico). Los textos van como texto, nunca
// como fórmula, así que un nombre que empiece por "=" no se ejecuta.

import { SEMAFORO } from './reporteClaseDatos';

const AZUL = 'FF0736FE';
const NEGRO = 'FF000000';
const BLANCO = 'FFFFFFFF';
const LIENZO = 'FFE9EDFB';
const VERDE = 'FF0AB05D';
const ROJO = 'FFB00A26';
const ROSA = 'FFFFD0D0';
const ESTADO = { 'al-dia': [VERDE, NEGRO], 'en-riesgo': [ROSA, NEGRO], 'sin-actividad': [ROJO, BLANCO] };
const ZONA = 'America/Bogota';

const borde = { style: 'thin', color: { argb: NEGRO } };
const bordes = { top: borde, left: borde, bottom: borde, right: borde };
const fecha = (d) => (d ? new Date(d).toLocaleDateString('es-CO', { timeZone: ZONA, day: '2-digit', month: '2-digit', year: 'numeric' }) : '—');

/** Título azul a todo el ancho y una línea de contexto debajo. */
const encabezadoHoja = (hoja, titulo, contexto, columnas) => {
  hoja.mergeCells(1, 1, 1, columnas);
  const t = hoja.getCell(1, 1);
  t.value = titulo;
  t.font = { name: 'Arial', size: 16, bold: true, color: { argb: BLANCO } };
  t.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: AZUL } };
  t.alignment = { vertical: 'middle', indent: 1 };
  hoja.getRow(1).height = 30;
  hoja.mergeCells(2, 1, 2, columnas);
  const c = hoja.getCell(2, 1);
  c.value = contexto;
  c.font = { name: 'Arial', size: 10, italic: true, color: { argb: 'FF3B4252' } };
  c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LIENZO } };
  c.alignment = { indent: 1 };
};

/** Tabla con encabezado azul desde la fila `desde`; devuelve la última fila escrita. */
const tabla = (hoja, desde, columnas, filas) => {
  const cab = hoja.getRow(desde);
  columnas.forEach((col, k) => {
    const celda = cab.getCell(k + 1);
    celda.value = col.titulo;
    celda.font = { name: 'Arial', bold: true, color: { argb: BLANCO } };
    celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NEGRO } };
    celda.border = bordes;
    celda.alignment = { vertical: 'middle', wrapText: true };
    hoja.getColumn(k + 1).width = col.ancho ?? 14;
  });
  cab.height = 22;
  filas.forEach((fila, i) => {
    const row = hoja.getRow(desde + 1 + i);
    fila.forEach((valor, k) => {
      const celda = row.getCell(k + 1);
      celda.value = valor;
      celda.font = { name: 'Arial', size: 10 };
      celda.border = bordes;
      if (columnas[k].formato) celda.numFmt = columnas[k].formato;
      if (i % 2) celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF7F8FE' } };
    });
  });
  return desde + filas.length;
};

const barrasDeDatos = (hoja, rango, color = AZUL) => {
  hoja.addConditionalFormatting({
    ref: rango,
    rules: [{ type: 'dataBar', priority: 1, minLength: 0, maxLength: 100, gradient: false, color: { argb: color }, cfvo: [{ type: 'num', value: 0 }, { type: 'max' }] }],
  });
};

export const generarExcel = async (datos) => {
  const { default: ExcelJS } = await import('exceljs');
  const libro = new ExcelJS.Workbook();
  libro.creator = 'CODECOMP';
  libro.created = new Date();
  const contexto = `Clase ${datos.clase} · generado el ${fecha(datos.fecha)}${datos.docente ? ` · docente ${datos.docente}` : ''} · datos personales de uso exclusivo del docente (Ley 1581)`;

  /* Resumen */
  const resumen = libro.addWorksheet('Resumen', { views: [{ showGridLines: false }] });
  encabezadoHoja(resumen, 'CODECOMP · Reporte de la clase', contexto, 4);
  const r = datos.resumen;
  let fila = tabla(resumen, 4, [{ titulo: 'Indicador', ancho: 30 }, { titulo: 'Valor', ancho: 16 }], [
    ['Estudiantes', r.estudiantes],
    ['Activos esta semana', r.activos],
    ['Nivel promedio', r.nivelPromedio],
    ['Problemas y ejercicios resueltos', r.resueltos],
    ['Envíos al juez', r.envios],
    ['Estudiantes con alertas', r.conAlertas],
  ]);
  for (let k = 5; k <= fila; k += 1) resumen.getCell(k, 2).font = { name: 'Arial', size: 12, bold: true, color: { argb: AZUL } };
  fila += 2;
  resumen.getCell(fila, 1).value = 'Distribución de niveles';
  resumen.getCell(fila, 1).font = { name: 'Arial', size: 12, bold: true };
  const inicioNiveles = fila + 2;
  fila = tabla(resumen, fila + 1, [{ titulo: 'Rango de nivel', ancho: 30 }, { titulo: 'Estudiantes', ancho: 16 }], datos.niveles.map((n) => [n.etiqueta, n.cantidad]));
  barrasDeDatos(resumen, `B${inicioNiveles}:B${fila}`);

  /* Estudiantes */
  const est = libro.addWorksheet('Estudiantes', { views: [{ state: 'frozen', ySplit: 4, showGridLines: false }] });
  encabezadoHoja(est, 'Detalle por estudiante', `${contexto}. Resueltos = Problemas + Fundamentos.`, 11);
  const finEst = tabla(est, 4, [
    { titulo: 'Estudiante', ancho: 28 }, { titulo: 'Correo', ancho: 30 }, { titulo: 'Estado', ancho: 15 },
    { titulo: 'Nivel', ancho: 9 }, { titulo: 'Resueltos', ancho: 11 }, { titulo: 'Problemas', ancho: 11 },
    { titulo: 'Fundamentos', ancho: 13 }, { titulo: 'Envíos', ancho: 9 }, { titulo: 'Min. esta semana', ancho: 13 },
    { titulo: 'Última actividad', ancho: 15 }, { titulo: 'Alertas', ancho: 30 },
  ], datos.estudiantes.map((e) => [
    e.nombre, e.correo, SEMAFORO[e.estado], e.nivel, e.resueltos, e.problemas, e.fundamentos, e.envios,
    e.minutosSemana, fecha(e.ultimaActividad), e.alertas.join(', ') || '—',
  ]));
  datos.estudiantes.forEach((e, i) => {
    const celda = est.getCell(5 + i, 3);
    const [fondo, texto] = ESTADO[e.estado];
    celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fondo } };
    celda.font = { name: 'Arial', size: 10, bold: true, color: { argb: texto } };
  });
  if (datos.estudiantes.length) {
    est.autoFilter = { from: { row: 4, column: 1 }, to: { row: finEst, column: 11 } };
    barrasDeDatos(est, `D5:D${finEst}`);
    barrasDeDatos(est, `E5:E${finEst}`, VERDE);
    barrasDeDatos(est, `I5:I${finEst}`);
  }

  /* Temas */
  const temas = libro.addWorksheet('Temas', { views: [{ showGridLines: false }] });
  encabezadoHoja(temas, 'Dominio de la clase por tema', 'Porcentaje de envíos aceptados de toda la clase, de lo que más cuesta a lo que mejor va.', 4);
  const finTemas = tabla(temas, 4, [{ titulo: 'Tema', ancho: 26 }, { titulo: 'Envíos', ancho: 10 }, { titulo: 'Aceptados', ancho: 11 }, { titulo: '% aceptados', ancho: 14, formato: '0%' }],
    datos.temas.map((t) => [t.tema, t.intentos, t.aciertos, t.porcentaje / 100]));
  datos.temas.forEach((t, i) => {
    const celda = temas.getCell(5 + i, 4);
    const color = t.porcentaje < 40 ? ROJO : t.porcentaje < 70 ? AZUL : VERDE;
    celda.font = { name: 'Arial', size: 10, bold: true, color: { argb: color } };
  });
  if (datos.temas.length) barrasDeDatos(temas, `D5:D${finTemas}`);

  /* Actividad */
  const act = libro.addWorksheet('Actividad', { views: [{ showGridLines: false }] });
  encabezadoHoja(act, 'Actividad de la clase', 'Minutos activos por día, últimos 14 días (hora de Bogotá).', 3);
  const finAct = tabla(act, 4, [{ titulo: 'Día', ancho: 14 }, { titulo: 'Minutos activos', ancho: 16 }, { titulo: 'Estudiantes', ancho: 13 }],
    datos.actividad.map((d) => [d.dia, d.minutos, d.estudiantes]));
  if (datos.actividad.length) barrasDeDatos(act, `B5:B${finAct}`);

  /* Problemas */
  const prob = libro.addWorksheet('Problemas', { views: [{ showGridLines: false }] });
  encabezadoHoja(prob, 'Problemas que más cuestan', 'Los problemas con más envíos fallidos de la clase.', 4);
  const finProb = tabla(prob, 4, [{ titulo: 'Problema', ancho: 40 }, { titulo: 'Envíos fallidos', ancho: 15 }, { titulo: 'Lo resolvieron', ancho: 15 }, { titulo: 'Lo intentaron', ancho: 15 }],
    datos.problemas.map((p) => [p.problema, p.fallos, p.resolvieron, p.intentaron]));
  if (datos.problemas.length) barrasDeDatos(prob, `B5:B${finProb}`, ROJO);

  /* A quién acompañar */
  const aco = libro.addWorksheet('Acompañar', { views: [{ showGridLines: false }] });
  encabezadoHoja(aco, 'A quién acompañar', 'Estudiantes estancados, en riesgo o sin actividad, con el motivo y qué hacer.', 4);
  tabla(aco, 4, [{ titulo: 'Estudiante', ancho: 30 }, { titulo: 'Estado', ancho: 15 }, { titulo: 'Motivo', ancho: 36 }, { titulo: 'Qué hacer', ancho: 60 }],
    datos.acompanar.map((a) => [a.nombre, SEMAFORO[a.estado], a.motivo, a.sugerencia]));
  for (let k = 5; k < 5 + datos.acompanar.length; k += 1) aco.getCell(k, 4).alignment = { wrapText: true, vertical: 'top' };
  datos.acompanar.forEach((a, i) => {
    const celda = aco.getCell(5 + i, 2);
    const [fondo, texto] = ESTADO[a.estado];
    celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fondo } };
    celda.font = { name: 'Arial', size: 10, bold: true, color: { argb: texto } };
  });

  const buffer = await libro.xlsx.writeBuffer();
  return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
};
