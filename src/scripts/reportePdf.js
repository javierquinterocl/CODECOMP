// Reporte de la clase en PDF con el diseño de CODECOMP: portada azul, cifras, gráficos de barras
// dibujados con jsPDF y tablas con semáforo. Se carga solo al pulsar el botón (import dinámico).

import { SEMAFORO } from './reporteClaseDatos';

const AZUL = [7, 54, 254];
const NEGRO = [0, 0, 0];
const LIENZO = [233, 237, 251];
const TINTA = [59, 66, 82];
const VERDE = [10, 176, 93];
const ROJO = [176, 10, 38];
const ROSA = [255, 208, 208];
const COLOR_ESTADO = { 'al-dia': VERDE, 'en-riesgo': ROSA, 'sin-actividad': ROJO };
const ZONA = 'America/Bogota';
const MARGEN = 14;

// Helvetica del PDF solo trae Latin-1: lo demás se reemplaza para que nunca salga basura.
const latin = (texto) => String(texto ?? '').replace(/[^ -ÿ–—•…]/g, '?');
const fecha = (d) => (d ? new Date(d).toLocaleDateString('es-CO', { timeZone: ZONA, day: 'numeric', month: 'short', year: 'numeric' }) : '—');

export const generarPdf = async (datos) => {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
  const doc = new jsPDF('p', 'mm', 'a4');
  doc.setProperties({ title: `Reporte de ${latin(datos.clase)}`, creator: 'CODECOMP' });
  const ancho = doc.internal.pageSize.getWidth();
  const alto = doc.internal.pageSize.getHeight();
  const util = ancho - MARGEN * 2;
  let y = 0;

  const asegurar = (necesario) => {
    if (y + necesario > alto - 18) { doc.addPage(); y = MARGEN + 4; }
  };
  const caja = (x, cy, w, h, relleno = [255, 255, 255]) => {
    doc.setFillColor(...NEGRO);
    doc.rect(x + 1.2, cy + 1.2, w, h, 'F');
    doc.setFillColor(...relleno);
    doc.setDrawColor(...NEGRO);
    doc.setLineWidth(0.5);
    doc.rect(x, cy, w, h, 'FD');
  };
  const seccion = (titulo, subtitulo, necesario = 50) => {
    asegurar(necesario);
    doc.setFillColor(...AZUL);
    doc.rect(MARGEN, y, 3, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...NEGRO);
    doc.text(latin(titulo), MARGEN + 6, y + 5.5);
    y += 9;
    if (subtitulo) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(...TINTA);
      doc.text(latin(subtitulo), MARGEN + 6, y);
      y += 5;
    }
  };
  const vacio = (texto) => {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(...TINTA);
    doc.text(latin(texto), MARGEN + 6, y + 4);
    y += 10;
  };

  /* Portada */
  doc.setFillColor(...AZUL);
  doc.rect(0, 0, ancho, 62, 'F');
  // Cuadrícula atenuada, como en el hero del sitio: no compite con el texto blanco.
  doc.setGState(new doc.GState({ opacity: 0.14 }));
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.15);
  for (let gx = 0; gx < ancho; gx += 8) doc.line(gx, 0, gx, 62);
  for (let gy = 0; gy < 62; gy += 8) doc.line(0, gy, ancho, gy);
  doc.setGState(new doc.GState({ opacity: 1 }));
  doc.setFillColor(...NEGRO);
  doc.rect(0, 62, ancho, 1.2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('courier', 'bold');
  doc.setFontSize(11);
  doc.text('CODECOMP', MARGEN, 16);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.text('Reporte de la clase', MARGEN, 31);
  doc.setFontSize(15);
  doc.text(doc.splitTextToSize(latin(datos.clase), util)[0], MARGEN, 41);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text(latin(`Generado el ${fecha(datos.fecha)}${datos.docente ? ` · Docente: ${datos.docente}` : ''} · Programa de Ingeniería de Sistemas, UFPS Ocaña`), MARGEN, 52);
  y = 72;

  /* Cifras */
  const r = datos.resumen;
  const cifras = [
    ['Estudiantes', r.estudiantes],
    ['Activos esta semana', `${r.activos} de ${r.estudiantes}`],
    ['Nivel promedio', r.nivelPromedio || '—'],
    ['Resueltos (Prob. + Fund.)', r.resueltos],
    ['Envíos al juez', r.envios],
    ['Con alertas', r.conAlertas],
  ];
  const wCifra = (util - 2 * 5) / 3;
  cifras.forEach(([etiqueta, valor], k) => {
    const x = MARGEN + (k % 3) * (wCifra + 5);
    const cy = y + Math.floor(k / 3) * 26;
    caja(x, cy, wCifra, 21, k === 5 && r.conAlertas ? ROSA : [255, 255, 255]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...AZUL);
    doc.text(latin(etiqueta.toUpperCase()), x + 4, cy + 6.5);
    doc.setFontSize(17);
    doc.setTextColor(...NEGRO);
    doc.text(latin(String(valor)), x + 4, cy + 16.5);
  });
  y += 2 * 26 + 6;

  /* Gráfico de barras horizontales: etiqueta, barra y valor */
  const barras = (items, { max, formato = (v) => String(v), colores } = {}) => {
    const tope = Math.max(1, max ?? Math.max(...items.map((i) => i.valor)));
    const wEtiqueta = 48;
    const wBarra = util - wEtiqueta - 22;
    items.forEach((it, k) => {
      asegurar(8);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(...NEGRO);
      doc.text(doc.splitTextToSize(latin(it.etiqueta), wEtiqueta - 2)[0], MARGEN + 2, y + 4.2);
      doc.setDrawColor(...NEGRO);
      doc.setLineWidth(0.3);
      doc.setFillColor(...LIENZO);
      doc.rect(MARGEN + wEtiqueta, y, wBarra, 5.5, 'FD');
      let x = MARGEN + wEtiqueta;
      for (const [parte, color] of (it.partes ?? [[it.valor, colores?.(it, k) ?? AZUL]])) {
        const w = (parte / tope) * wBarra;
        if (w > 0) { doc.setFillColor(...color); doc.rect(x, y, w, 5.5, 'F'); x += w; }
      }
      doc.setFont('helvetica', 'bold');
      doc.text(latin(formato(it.valor, it)), MARGEN + wEtiqueta + wBarra + 3, y + 4.2);
      y += 7.5;
    });
    y += 3;
  };

  seccion('Distribución de niveles', 'Cuántos estudiantes hay en cada rango de nivel real.', 50);
  if (r.estudiantes) barras(datos.niveles.map((n) => ({ etiqueta: n.etiqueta, valor: n.cantidad })), { formato: (v) => `${v}` });
  else vacio('La clase todavía no tiene estudiantes.');

  seccion('Dominio de la clase por tema', 'Porcentaje de envíos aceptados de toda la clase. Primero los temas que más cuestan.', 40);
  if (datos.temas.length) {
    barras(datos.temas.map((t) => ({ etiqueta: t.tema, valor: t.porcentaje })), {
      max: 100,
      formato: (v, it) => `${v} %  (${datos.temas.find((t) => t.tema === it.etiqueta).intentos} env.)`,
      colores: (it) => (it.valor < 40 ? ROJO : it.valor < 70 ? AZUL : VERDE),
    });
  } else vacio('Aún no hay envíos en Problemas para medir los temas.');

  seccion('Resueltos por estudiante', 'Problemas (azul) y ejercicios de Fundamentos (negro). Los 15 que más resolvieron.', 40);
  if (datos.resueltos.some((e) => e.problemas + e.fundamentos)) {
    barras(datos.resueltos.map((e) => ({ etiqueta: e.nombre, valor: e.problemas + e.fundamentos, partes: [[e.problemas, AZUL], [e.fundamentos, NEGRO]] })));
  } else vacio('Todavía nadie ha resuelto ejercicios.');

  /* Actividad: barras verticales por día */
  seccion('Actividad de la clase', 'Minutos activos por día, últimos 14 días (hora de Bogotá).', 62);
  if (datos.actividad.length) {
    const hG = 38;
    const tope = Math.max(1, ...datos.actividad.map((d) => d.minutos));
    const paso = util / Math.max(datos.actividad.length, 7);
    doc.setDrawColor(...NEGRO);
    doc.setLineWidth(0.4);
    doc.line(MARGEN, y + hG, MARGEN + util, y + hG);
    datos.actividad.forEach((d, k) => {
      const h = Math.max(0.8, (d.minutos / tope) * (hG - 6));
      const x = MARGEN + k * paso + paso * 0.18;
      doc.setFillColor(...AZUL);
      doc.rect(x, y + hG - h, paso * 0.64, h, 'F');
      doc.setFontSize(7);
      doc.setTextColor(...NEGRO);
      doc.text(String(d.minutos), x + paso * 0.32, y + hG - h - 1.5, { align: 'center' });
      doc.setTextColor(...TINTA);
      doc.text(d.dia.slice(8, 10) + '/' + d.dia.slice(5, 7), x + paso * 0.32, y + hG + 4, { align: 'center' });
    });
    y += hG + 10;
  } else vacio('Sin actividad registrada en los últimos 14 días.');

  const tabla = (head, body, opciones = {}) => {
    autoTable(doc, {
      startY: y,
      margin: { left: MARGEN, right: MARGEN },
      head: [head.map(latin)],
      body: body.map((fila) => fila.map((c) => latin(c))),
      theme: 'grid',
      styles: { font: 'helvetica', fontSize: 8, cellPadding: 1.8, lineColor: NEGRO, lineWidth: 0.25, textColor: NEGRO, overflow: 'linebreak' },
      headStyles: { fillColor: AZUL, textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [247, 248, 254] },
      ...opciones,
    });
    y = doc.lastAutoTable.finalY + 8;
  };

  seccion('Problemas que más cuestan', 'Los problemas con más envíos fallidos de la clase.', 30);
  if (datos.problemas.length) {
    tabla(['Problema', 'Envíos fallidos', 'Lo resolvieron'], datos.problemas.map((p) => [p.problema, String(p.fallos), `${p.resolvieron} de ${p.intentaron}`]), { columnStyles: { 0: { cellWidth: util * 0.6 } } });
  } else vacio('Sin datos todavía.');

  seccion('A quién acompañar', 'Estudiantes estancados, en riesgo o sin actividad, con el motivo y qué hacer.', 30);
  if (datos.acompanar.length) {
    tabla(['Estudiante', 'Estado', 'Motivo', 'Qué hacer'], datos.acompanar.map((a) => [a.nombre, SEMAFORO[a.estado], a.motivo, a.sugerencia]), {
      columnStyles: { 0: { cellWidth: 38 }, 1: { cellWidth: 24 }, 2: { cellWidth: 40 } },
      didParseCell: (c) => {
        if (c.section === 'body' && c.column.index === 1) {
          const estado = datos.acompanar[c.row.index].estado;
          c.cell.styles.fillColor = COLOR_ESTADO[estado];
          c.cell.styles.textColor = estado === 'sin-actividad' ? [255, 255, 255] : NEGRO;
          c.cell.styles.fontStyle = 'bold';
        }
      },
    });
  } else vacio('Toda la clase está al día. ¡Bien!');

  seccion('Detalle por estudiante', 'Ordenados por nivel. Resueltos = Problemas + Fundamentos.', 30);
  if (datos.estudiantes.length) {
    tabla(
      ['Estudiante', 'Estado', 'Nivel', 'Resueltos', 'Prob.', 'Fund.', 'Envíos', 'Min. semana', 'Última vez'],
      datos.estudiantes.map((e) => [e.nombre, SEMAFORO[e.estado], String(e.nivel), String(e.resueltos), String(e.problemas), String(e.fundamentos), String(e.envios), String(e.minutosSemana), fecha(e.ultimaActividad)]),
      {
        styles: { font: 'helvetica', fontSize: 7.5, cellPadding: 1.5, lineColor: NEGRO, lineWidth: 0.25, textColor: NEGRO, overflow: 'linebreak' },
        columnStyles: { 0: { cellWidth: 46 }, 1: { cellWidth: 22 } },
        didParseCell: (c) => {
          if (c.section === 'body' && c.column.index === 1) {
            const estado = datos.estudiantes[c.row.index].estado;
            c.cell.styles.fillColor = COLOR_ESTADO[estado];
            c.cell.styles.textColor = estado === 'sin-actividad' ? [255, 255, 255] : NEGRO;
            c.cell.styles.fontStyle = 'bold';
          }
        },
      },
    );
  } else vacio('La clase todavía no tiene estudiantes.');

  /* Pie en cada página */
  const paginas = doc.getNumberOfPages();
  for (let k = 1; k <= paginas; k += 1) {
    doc.setPage(k);
    doc.setDrawColor(...NEGRO);
    doc.setLineWidth(0.4);
    doc.line(MARGEN, alto - 12, ancho - MARGEN, alto - 12);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...TINTA);
    doc.text(latin(`CODECOMP · ${datos.clase} · Datos personales: uso exclusivo del docente (Ley 1581)`), MARGEN, alto - 7);
    doc.text(`Página ${k} de ${paginas}`, ancho - MARGEN, alto - 7, { align: 'right' });
  }
  return doc.output('blob');
};
