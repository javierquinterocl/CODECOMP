import { useEffect, useMemo, useState } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getSessionsHistory } from '../scripts/registerService';
import { SearchIcon } from './AppIcons';

const POR_PAGINA = 8;
const METODOS = ['facebook', 'github', 'google', 'password'];
const nombreMetodo = (m) => (m === 'password' ? 'Email / Password' : m ? m.charAt(0).toUpperCase() + m.slice(1) : 'N/D');

const formatDateTime = (timestamp) => {
  if (!timestamp) return 'En curso';
  const date = new Date(timestamp);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const time = date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  return `${day}/${month}/${date.getFullYear()} ${time}`;
};

const formatDuration = (ms) => {
  if (!ms || ms <= 0) return 'N/D';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${totalSeconds % 60}s`;
  return `${totalSeconds}s`;
};

const descargarPdf = (sesiones, { estado, metodo, busqueda }) => {
  const doc = new jsPDF('l', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const reportDate = new Date();
  const estadoLabel = estado ? (estado === 'activo' ? 'Activos' : 'Finalizados') : 'Todos';
  const metodoLabel = metodo ? nombreMetodo(metodo) : 'Todos';

  doc.setFillColor(7, 54, 254);
  doc.rect(0, 0, pageWidth, 32, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('CODECOMP', 14, 17);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text('Reporte de historial de sesiones', 14, 25);
  doc.setFontSize(9);
  doc.text(`Generado: ${formatDateTime(reportDate.getTime())}`, pageWidth - 14, 17, { align: 'right' });
  doc.text(`Filtros: ${estadoLabel} / ${metodoLabel}`, pageWidth - 14, 25, { align: 'right' });

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.text(`Registros: ${sesiones.length}`, 14, 42);
  doc.text(`Activos: ${sesiones.filter((s) => s.status === 'activo').length}`, 60, 42);
  doc.text(`Finalizados: ${sesiones.filter((s) => s.status === 'finalizado').length}`, 100, 42);
  doc.text(`Búsqueda: ${busqueda.trim() || 'Sin filtro'}`, 150, 42);

  autoTable(doc, {
    startY: 48,
    head: [['#', 'Usuario', 'Correo', 'Código', 'Método', 'Estado', 'Entrada', 'Salida', 'Duración']],
    body: sesiones.map((s, i) => [
      String(i + 1),
      `${s.nombre || ''} ${s.apellido || ''}`.trim() || 'Sin nombre',
      s.email || 'Sin correo',
      s.codigo || 'Sin código',
      nombreMetodo(s.method),
      s.status || 'N/D',
      formatDateTime(s.entryTime),
      formatDateTime(s.exitTime),
      s.status === 'activo' ? 'En curso' : formatDuration(s.duration),
    ]),
    theme: 'grid',
    styles: { font: 'helvetica', fontSize: 7, cellPadding: 1.8, textColor: [0, 0, 0], lineColor: [0, 0, 0], lineWidth: 0.2 },
    headStyles: { fillColor: [7, 54, 254], textColor: [255, 255, 255], fontStyle: 'bold' },
    margin: { left: 12, right: 12 },
    didDrawPage: () => {
      doc.setFontSize(8);
      doc.text(`Página ${doc.internal.getNumberOfPages()}`, 14, pageHeight - 8);
      doc.text('Reporte generado desde CODECOMP', pageWidth - 14, pageHeight - 8, { align: 'right' });
    },
  });

  doc.save(`historial-sesiones-${reportDate.toISOString().slice(0, 10)}.pdf`);
};

const Filtro = ({ activo, onClick, children }) => (
  <button type="button" className={`nb-doc-filtro${activo ? ' is-active' : ''}`} aria-pressed={activo} onClick={onClick}>
    {children}
  </button>
);

/** Historial de inicios de sesión (Firestore), con búsqueda, filtros, páginas y PDF. */
const HistorialSesiones = () => {
  const [sesiones, setSesiones] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [estado, setEstado] = useState(null);
  const [metodo, setMetodo] = useState(null);
  const [pagina, setPagina] = useState(1);

  useEffect(() => {
    let vigente = true;
    getSessionsHistory()
      .then((datos) => { if (vigente) setSesiones(datos); })
      .catch(() => { if (vigente) setSesiones([]); });
    return () => { vigente = false; };
  }, []);

  const filtradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return (sesiones || []).filter((s) => {
      if (estado && s.status !== estado) return false;
      if (metodo && s.method !== metodo) return false;
      if (!q) return true;
      return `${s.nombre || ''} ${s.apellido || ''} ${s.email || ''} ${s.codigo || ''}`.toLowerCase().includes(q);
    });
  }, [sesiones, busqueda, estado, metodo]);

  if (!sesiones) return <p className="nb-doc-vacio">Cargando sesiones…</p>;

  const paginas = Math.max(1, Math.ceil(filtradas.length / POR_PAGINA));
  const actual = Math.min(pagina, paginas);
  const visibles = filtradas.slice((actual - 1) * POR_PAGINA, actual * POR_PAGINA);
  const filtrar = (fn) => (valor) => { fn(valor); setPagina(1); };

  return (
    <div className="nb-doc-sesiones">
      <div className="nb-doc-herramientas">
        <div className="nb-pb-search nb-pb-search-inline">
          <SearchIcon />
          <input
            type="search"
            value={busqueda}
            onChange={(e) => filtrar(setBusqueda)(e.target.value)}
            placeholder="Buscar por nombre, código o correo"
            aria-label="Buscar sesiones"
          />
        </div>
        <button
          type="button"
          className="nb-ex-send"
          disabled={!filtradas.length}
          onClick={() => descargarPdf(filtradas, { estado, metodo, busqueda })}
        >
          Descargar PDF
        </button>
      </div>

      <div className="nb-doc-filtros">
        <span className="nb-dash-kicker is-ink">Estado</span>
        <Filtro activo={!estado} onClick={() => filtrar(setEstado)(null)}>Todos</Filtro>
        <Filtro activo={estado === 'activo'} onClick={() => filtrar(setEstado)('activo')}>Activos</Filtro>
        <Filtro activo={estado === 'finalizado'} onClick={() => filtrar(setEstado)('finalizado')}>Finalizados</Filtro>
      </div>
      <div className="nb-doc-filtros">
        <span className="nb-dash-kicker is-ink">Método</span>
        <Filtro activo={!metodo} onClick={() => filtrar(setMetodo)(null)}>Todos</Filtro>
        {METODOS.map((m) => (
          <Filtro key={m} activo={metodo === m} onClick={() => filtrar(setMetodo)(m)}>{nombreMetodo(m)}</Filtro>
        ))}
      </div>

      {visibles.length ? (
        <ul className="nb-doc-tabla">
          {visibles.map((s) => (
            <li key={s.id} className="nb-doc-fila">
              <span className={`nb-doc-estado${s.status === 'activo' ? ' is-on' : ''}`}>{s.status || 'N/D'}</span>
              <span className="nb-doc-celda is-grande">
                <strong>{`${s.nombre || ''} ${s.apellido || ''}`.trim() || 'Sin nombre'}</strong>
                <small>{s.email} · Código {s.codigo || '—'}</small>
              </span>
              <span className="nb-doc-celda">{nombreMetodo(s.method)}</span>
              <span className="nb-doc-celda">
                <small>Entrada {formatDateTime(s.entryTime)}</small>
                <small>Salida {formatDateTime(s.exitTime)}</small>
                <small>Duración {s.status === 'activo' ? 'en curso' : formatDuration(s.duration)}</small>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="nb-doc-vacio">No hay sesiones con esos filtros.</p>
      )}

      <div className="nb-doc-paginas">
        <span className="nb-dash-kicker is-ink">
          {filtradas.length ? `${(actual - 1) * POR_PAGINA + 1}-${(actual - 1) * POR_PAGINA + visibles.length}` : 0} de {filtradas.length}
        </span>
        <button type="button" className="nb-doc-filtro" disabled={actual === 1} onClick={() => setPagina(actual - 1)}>Anterior</button>
        <span className="nb-dash-kicker is-ink">Página {actual} de {paginas}</span>
        <button type="button" className="nb-doc-filtro" disabled={actual === paginas} onClick={() => setPagina(actual + 1)}>Siguiente</button>
      </div>
    </div>
  );
};

export default HistorialSesiones;
