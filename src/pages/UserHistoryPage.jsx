import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useAuth } from '../context/AuthContext';
import { getSessionsHistory } from '../scripts/registerService';

const SearchIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35m1.85-5.4a7.2 7.2 0 11-14.4 0 7.2 7.2 0 0114.4 0z" />
  </svg>
);

const ChevronLeftIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
  </svg>
);

const ChevronRightIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
  </svg>
);

const EllipsisIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
    <circle cx="5" cy="12" r="1.6" />
    <circle cx="12" cy="12" r="1.6" />
    <circle cx="19" cy="12" r="1.6" />
  </svg>
);

const FilterIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h18l-7 8v6l-4 2v-8L3 4z" />
  </svg>
);

const statusStyles = {
  activo: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  finalizado: 'border-rose-200 bg-rose-50 text-rose-700',
};

const UserHistoryPage = () => {
  const navigate = useNavigate();
  const { user, isAdmin, displayName } = useAuth();

  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState(null);
  const [methodFilter, setMethodFilter] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    if (!user) return;
    if (!isAdmin) {
      navigate('/dashboard', { replace: true });
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const sessionsData = await getSessionsHistory();
        if (!cancelled) setSessions(sessionsData);
      } catch (error) {
        console.error('Error al cargar sesiones:', error);
        if (!cancelled) setSessions([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [user, isAdmin, navigate]);

  const filteredSessions = useMemo(() => {
    let result = [...sessions];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((session) => {
        const fullName = `${session.nombre || ''} ${session.apellido || ''}`.toLowerCase();
        const email = (session.email || '').toLowerCase();
        const codigo = (session.codigo || '').toLowerCase();
        return fullName.includes(query) || email.includes(query) || codigo.includes(query);
      });
    }

    if (statusFilter) {
      result = result.filter((session) => session.status === statusFilter);
    }

    if (methodFilter) {
      result = result.filter((session) => session.method === methodFilter);
    }

    return result;
  }, [sessions, searchQuery, statusFilter, methodFilter]);

  const handleSearchChange = (value) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const handleStatusFilterChange = (value) => {
    setStatusFilter(value);
    setCurrentPage(1);
  };

  const handleMethodFilterChange = (value) => {
    setMethodFilter(value);
    setCurrentPage(1);
  };

  const totalPages = Math.ceil(filteredSessions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedSessions = filteredSessions.slice(startIndex, startIndex + itemsPerPage);

  const visiblePageNumbers = useMemo(() => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, index) => index + 1);

    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + 4);

    if (endPage - startPage < 4) {
      startPage = Math.max(1, endPage - 4);
    }

    return Array.from({ length: endPage - startPage + 1 }, (_, index) => startPage + index);
  }, [currentPage, totalPages]);

  const formatDateTime = (timestamp) => {
    if (!timestamp) return 'En curso';
    const date = new Date(timestamp);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const time = date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    return `${day}/${month}/${year} ${time}`;
  };

  const formatDuration = (ms) => {
    if (!ms || ms <= 0) return 'N/D';
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
  };

  const handleDownloadReport = () => {
    if (!filteredSessions.length) return;

    const doc = new jsPDF('l', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const reportDate = new Date();
    const fileDate = reportDate.toISOString().slice(0, 10);

    const statusLabel = statusFilter
      ? statusFilter === 'activo'
        ? 'Activos'
        : 'Finalizados'
      : 'Todos';
    const methodLabel = methodFilter
      ? methodFilter === 'password'
        ? 'Email / Password'
        : methodFilter.charAt(0).toUpperCase() + methodFilter.slice(1)
      : 'Todos';
    const activeCount = filteredSessions.filter((session) => session.status === 'activo').length;
    const finishedCount = filteredSessions.filter((session) => session.status === 'finalizado').length;
    const methodsCount = new Set(filteredSessions.map((session) => session.method || 'N/D')).size;

    doc.setFillColor(37, 99, 235);
    doc.rect(0, 0, pageWidth, 32, 'F');
    doc.setFillColor(30, 64, 175);
    doc.rect(0, 0, pageWidth, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('CODECOMP', 14, 17);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text('Reporte de historial de usuarios', 14, 25);
    doc.setFontSize(9);
    doc.text(`Generado: ${formatDateTime(reportDate.getTime())}`, pageWidth - 14, 17, { align: 'right' });
    doc.text(`Filtros aplicados: ${statusLabel} / ${methodLabel}`, pageWidth - 14, 25, { align: 'right' });

    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('Resumen del reporte', 14, 44);

    const cards = [
      { label: 'Registros', value: String(filteredSessions.length), x: 14, fill: [239, 246, 255], accent: [59, 130, 246] },
      { label: 'Activos', value: String(activeCount), x: 70, fill: [240, 253, 244], accent: [16, 185, 129] },
      { label: 'Finalizados', value: String(finishedCount), x: 126, fill: [255, 241, 242], accent: [244, 63, 94] },
      { label: 'Métodos', value: String(methodsCount), x: 182, fill: [240, 249, 255], accent: [14, 165, 233] },
    ];

    cards.forEach((card) => {
      doc.setFillColor(...card.fill);
      doc.setDrawColor(...card.accent);
      doc.roundedRect(card.x, 50, 48, 18, 3, 3, 'FD');
      doc.setTextColor(30, 41, 59);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text(card.value, card.x + 5, 60);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(card.label, card.x + 5, 66);
    });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Estado: ${statusLabel}`, 14, 77);
    doc.text(`Método: ${methodLabel}`, 14, 83);
    doc.text(`Búsqueda: ${searchQuery.trim() || 'Sin filtro'}`, 14, 89);

    const tableBody = filteredSessions.map((session, index) => [
      String(index + 1),
      `${session.nombre || ''} ${session.apellido || ''}`.trim() || 'Sin nombre',
      session.email || 'Sin correo',
      session.codigo || 'Sin código',
      session.method === 'password' ? 'Email / Password' : (session.method || 'N/D'),
      session.status || 'N/D',
      formatDateTime(session.entryTime),
      formatDateTime(session.exitTime),
      session.status === 'activo' ? 'En curso' : formatDuration(session.duration),
    ]);

    autoTable(doc, {
      startY: 96,
      head: [[
        '#',
        'Usuario',
        'Correo',
        'Código',
        'Método',
        'Estado',
        'Entrada',
        'Salida',
        'Duración',
      ]],
      body: tableBody,
      theme: 'grid',
      styles: {
        font: 'helvetica',
        fontSize: 7,
        cellPadding: 1.8,
        textColor: [15, 23, 42],
        lineColor: [219, 234, 254],
        lineWidth: 0.2,
      },
      headStyles: {
        fillColor: [59, 130, 246],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      columnStyles: {
        0: { cellWidth: 8 },
        1: { cellWidth: 36 },
        2: { cellWidth: 46 },
        3: { cellWidth: 24 },
        4: { cellWidth: 28 },
        5: { cellWidth: 22 },
        6: { cellWidth: 36 },
        7: { cellWidth: 36 },
        8: { cellWidth: 24 },
      },
      margin: { left: 12, right: 12 },
      tableWidth: 'auto',
      didDrawPage: () => {
        doc.setDrawColor(219, 234, 254);
        doc.setLineWidth(0.3);
        doc.line(12, pageHeight - 14, pageWidth - 12, pageHeight - 14);
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text(`Página ${doc.internal.getNumberOfPages()}`, 14, pageHeight - 8);
        doc.text('Reporte generado desde CODECOMP', pageWidth - 14, pageHeight - 8, { align: 'right' });
      },
    });

    doc.save(`historial-usuarios-${fileDate}.pdf`);
  };

  if (loading) return null;
  if (!isAdmin) return null;

  return (
    <div className="mx-auto max-w-6xl">

      {/* Header */}
      <header className="mb-7 flex items-end justify-between gap-6">
        <div className="max-w-3xl">
          <p className="mb-3 inline-flex rounded-full border border-blue-100 bg-blue-50/80 px-3 py-1 font-['Space_Grotesk'] text-[11px] font-bold uppercase tracking-[0.22em] text-blue-700 shadow-sm backdrop-blur">
            Historial de usuarios
          </p>
          <h1 className="font-['Space_Grotesk'] text-4xl font-bold tracking-tight text-slate-900 md:text-[2.85rem]">
            Sesiones de usuarios
          </h1>
          <p className="mt-3 max-w-2xl font-['Inter'] text-[15px] leading-7 text-slate-600">
            Revisión clara de accesos, método de autenticación y tiempo de sesión
          </p>
        </div>
      </header>

      {/* Search & Filter Bar */}
      <section className="mb-6 rounded-[28px] border border-blue-100/70 bg-white/85 p-4 shadow-[0_20px_50px_rgba(37,99,235,0.05)] backdrop-blur-xl md:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="relative w-full xl:max-w-2xl">
            <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-400">
              <SearchIcon />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Buscar por nombre, apellidos, código o correo"
              className="w-full rounded-2xl border border-blue-100 bg-white py-3.5 pl-11 pr-4 font-['Inter'] text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:shadow-[0_0_0_4px_rgba(59,130,246,0.08)]"
            />
          </div>

          <div className="flex flex-wrap justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsFiltersOpen((prev) => !prev)}
              className="inline-flex items-center gap-2 rounded-2xl border border-blue-100 bg-white px-4 py-3 font-['Space_Grotesk'] text-sm font-semibold text-blue-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-800"
            >
              <FilterIcon />
              Filtros
            </button>
            <button
              type="button"
              onClick={handleDownloadReport}
              disabled={!filteredSessions.length}
              className="inline-flex items-center gap-2 rounded-2xl border border-blue-600 bg-blue-600 px-4 py-3 font-['Space_Grotesk'] text-sm font-semibold text-white transition hover:border-blue-700 hover:bg-blue-700 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
            >
              Descargar PDF
            </button>
          </div>
        </div>

        {isFiltersOpen && (
          <div className="mt-4 rounded-[24px] border border-blue-100 bg-blue-50/70 p-4">
            <p className="mb-3 font-['Space_Grotesk'] text-xs font-bold uppercase tracking-wide text-blue-700">Estado</p>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <button
                onClick={() => handleStatusFilterChange(null)}
                className={`rounded-full border px-3.5 py-2 font-['Space_Grotesk'] text-xs font-semibold transition ${
                  statusFilter === null
                    ? 'border-blue-200 bg-blue-50 text-blue-700'
                    : 'border-blue-100 bg-white text-blue-700 hover:border-blue-200 hover:bg-blue-50'
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => handleStatusFilterChange('activo')}
                className={`rounded-full border px-3.5 py-2 font-['Space_Grotesk'] text-xs font-semibold transition ${
                  statusFilter === 'activo'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : 'border-blue-100 bg-white text-blue-700 hover:border-blue-200 hover:bg-blue-50'
                }`}
              >
                Activos
              </button>
              <button
                onClick={() => handleStatusFilterChange('finalizado')}
                className={`rounded-full border px-3.5 py-2 font-['Space_Grotesk'] text-xs font-semibold transition ${
                  statusFilter === 'finalizado'
                    ? 'border-rose-200 bg-rose-50 text-rose-700'
                    : 'border-blue-100 bg-white text-blue-700 hover:border-blue-200 hover:bg-blue-50'
                }`}
              >
                Finalizados
              </button>
            </div>

            <p className="mb-3 font-['Space_Grotesk'] text-xs font-bold uppercase tracking-wide text-blue-700">Método de autenticación</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setMethodFilter(null)}
                className={`rounded-full border px-3.5 py-2 font-['Space_Grotesk'] text-xs font-semibold transition ${
                  methodFilter === null
                    ? 'border-blue-200 bg-blue-50 text-blue-700'
                    : 'border-blue-100 bg-white text-blue-700 hover:border-blue-200 hover:bg-blue-50'
                }`}
              >
                Todos
              </button>
              {['facebook', 'github', 'google', 'password'].map((method) => (
                <button
                  key={method}
                  onClick={() => handleMethodFilterChange(method)}
                  className={`rounded-full border px-3.5 py-2 font-['Space_Grotesk'] text-xs font-semibold transition ${
                    methodFilter === method
                      ? 'border-blue-200 bg-blue-50 text-blue-700'
                      : 'border-blue-100 bg-white text-blue-700 hover:border-blue-200 hover:bg-blue-50'
                  }`}
                >
                  {method === 'password' ? 'Email/Password' : method.charAt(0).toUpperCase() + method.slice(1)}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <p className="font-['Inter'] text-sm text-slate-500">
            Mostrando {paginatedSessions.length > 0 ? startIndex + 1 : 0}-{startIndex + paginatedSessions.length} de {filteredSessions.length} usuarios
          </p>
        </div>
      </section>

      {/* Sessions Table */}
      <section className="grid grid-cols-1 gap-6">
        <article className="overflow-hidden rounded-[28px] border border-blue-100/70 bg-white/90 shadow-[0_24px_60px_rgba(37,99,235,0.06)] backdrop-blur-xl">
          <div className="border-b border-blue-100/60 bg-gradient-to-r from-blue-50 to-white px-5 py-5 md:px-6">
            <h2 className="font-['Space_Grotesk'] text-2xl font-bold text-blue-900">Listado de sesiones</h2>
          </div>

          <div className="hidden grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_minmax(0,1.2fr)_minmax(0,1.25fr)_minmax(0,1.8fr)] gap-4 border-b border-blue-100/60 bg-blue-50/40 px-6 py-3 text-[11px] font-bold uppercase tracking-[0.18em] text-blue-400 lg:grid">
            <span>Estado</span>
            <span>Usuario</span>
            <span>Método</span>
            <span>Correo y código</span>
            <span>Horario / Duración</span>
          </div>

          <div className="divide-y divide-blue-50">
            {paginatedSessions.length > 0 ? (
              paginatedSessions.map((session) => (
                <div
                  key={session.id}
                  className="grid gap-4 px-5 py-5 transition hover:bg-blue-50/50 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_minmax(0,1.2fr)_minmax(0,1.25fr)_minmax(0,1.8fr)] lg:items-center lg:px-6"
                >
                  <div className="min-w-0 flex items-center">
                    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 font-['Space_Grotesk'] text-xs font-bold uppercase tracking-wider ${statusStyles[session.status]}`}>
                      <span className={`h-2.5 w-2.5 rounded-full ${session.status === 'activo' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                      {session.status}
                    </span>
                  </div>

                  <div className="min-w-0">
                    <p className="truncate font-['Space_Grotesk'] text-[15px] font-bold text-blue-950">
                      {session.nombre} {session.apellido}
                    </p>
                    <p className="truncate font-['Inter'] text-sm text-slate-500">{session.email}</p>
                  </div>

                  <div className="min-w-0">
                    <p className="truncate font-['Space_Grotesk'] text-sm font-semibold uppercase tracking-wide text-blue-700">
                      {session.method === 'password' ? 'Email / Password' : session.method}
                    </p>
                  </div>

                  <div className="min-w-0">
                    <p className="truncate font-['Space_Grotesk'] text-sm font-bold text-blue-950">{session.email}</p>
                    <p className="truncate font-['Inter'] text-xs text-slate-400">Código: {session.codigo}</p>
                  </div>

                  <div className="min-w-0 flex flex-col gap-1">
                    <p className="truncate font-['Space_Grotesk'] text-sm font-bold text-blue-950">
                      Entrada {formatDateTime(session.entryTime)}
                    </p>
                    <p className="truncate font-['Space_Grotesk'] text-sm font-bold text-blue-500">
                      Salida {formatDateTime(session.exitTime)}
                    </p>
                    <p className="truncate font-['Space_Grotesk'] text-xs font-semibold text-slate-400">
                      Duración: {session.status === 'activo' ? 'En curso' : formatDuration(session.duration)}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-6 py-16 text-center">
                <p className="font-['Inter'] text-base text-slate-500">
                  {loading ? 'Cargando sesiones...' : 'No hay sesiones registradas'}
                </p>
              </div>
            )}
          </div>
        </article>
      </section>

      {/* Pagination */}
      <section className="mt-6 flex items-center justify-between gap-4 rounded-[24px] border border-blue-100/70 bg-white/85 px-5 py-4 shadow-[0_18px_40px_rgba(37,99,235,0.05)] backdrop-blur-xl md:px-6">
        <div>
          <p className="font-['Space_Grotesk'] text-sm font-bold uppercase tracking-[0.18em] text-blue-400">Páginas</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className={`flex items-center gap-2 rounded-full border px-4 py-2.5 font-['Space_Grotesk'] text-sm font-semibold transition ${
              currentPage === 1
                ? 'border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed'
                : 'border-blue-100 bg-white text-blue-700 hover:border-blue-200 hover:bg-blue-50'
            }`}
          >
            <ChevronLeftIcon />
            Anterior
          </button>

          {visiblePageNumbers.map((pageNum) => (
            <button
              key={pageNum}
              onClick={() => setCurrentPage(pageNum)}
              className={`rounded-full border px-4 py-2.5 font-['Space_Grotesk'] text-sm font-semibold transition ${
                currentPage === pageNum
                  ? 'border-blue-200 bg-blue-50 text-blue-700'
                  : 'border-blue-100 bg-white text-blue-700 hover:border-blue-200 hover:bg-blue-50'
              }`}
            >
              {pageNum}
            </button>
          ))}

          {totalPages > 5 && visiblePageNumbers[visiblePageNumbers.length - 1] < totalPages && (
            <span className="flex h-11 items-center justify-center px-1 text-blue-300">
              <EllipsisIcon />
            </span>
          )}

          <button
            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages || totalPages === 0}
            className={`flex items-center gap-2 rounded-full border px-4 py-2.5 font-['Space_Grotesk'] text-sm font-semibold transition ${
              currentPage === totalPages || totalPages === 0
                ? 'border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed'
                : 'border-blue-100 bg-white text-blue-700 hover:border-blue-200 hover:bg-blue-50'
            }`}
          >
            Siguiente
            <ChevronRightIcon />
          </button>
        </div>

        <div className="hidden lg:block">
          <p className="font-['Inter'] text-sm text-blue-500">
            Mostrando {paginatedSessions.length > 0 ? startIndex + 1 : 0}-{startIndex + paginatedSessions.length} de {filteredSessions.length}
          </p>
        </div>
      </section>

    </div>
  );
};

export default UserHistoryPage;
