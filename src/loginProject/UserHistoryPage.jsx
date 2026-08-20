import { useEffect, useState, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ADMIN_EMAILS } from '../config';
import { auth, db } from '../firebase/firebaseConfig';
import { getSessionsHistory, updateSessionExit } from './registerService';

const HomeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
  </svg>
);

const TrophyIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16 4H8m8 0a4 4 0 010 8H8a4 4 0 010-8m8 0v1m-8-1v1m-2 7H6a2 2 0 000 4h2m8 0h2a2 2 0 000-4h-2m-8 4v3m8-3v3M9 21h6" />
  </svg>
);

const TournamentIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M7 4h10v3a5 5 0 01-3 4.58V13a2 2 0 002 2h1a3 3 0 013 3v2H4v-2a3 3 0 013-3h1a2 2 0 002-2v-1.42A5 5 0 017 7V4zM9 4v2a3 3 0 006 0V4" />
  </svg>
);

const GruposIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
  </svg>
);

const LeaderboardIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

const HistoryIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const CodeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
  </svg>
);

const SettingsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const BellIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
  </svg>
);

const LogoutIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
  </svg>
);

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

const NavItem = ({ icon, label, to }) => (
  <Link
    to={to}
    className="flex items-center gap-3 rounded-lg px-4 py-3 font-['Space_Grotesk'] text-sm font-semibold text-slate-500 transition-all duration-200 hover:translate-x-1 hover:bg-slate-50 hover:text-slate-900"
  >
    {icon}
    {label}
  </Link>
);

const Avatar = ({ user, size = 'md' }) => {
  const initial = (user?.displayName || user?.email || '?')[0].toUpperCase();
  const sizeClasses = size === 'lg'
    ? 'h-24 w-24 text-3xl border-4'
    : 'h-8 w-8 text-sm border-2';

  if (user?.photoURL) {
    return (
      <img
        alt={user.displayName || 'Avatar'}
        className={`${sizeClasses} rounded-full border-white object-cover shadow-sm`}
        src={user.photoURL}
      />
    );
  }

  return (
    <div className={`${sizeClasses} flex items-center justify-center rounded-full border-white bg-gradient-to-br from-blue-700 to-blue-500 font-bold text-white shadow-sm`}>
      {initial}
    </div>
  );
};

const statusStyles = {
  activo: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  finalizado: 'border-rose-200 bg-rose-50 text-rose-700',
};

const normalizeEmail = (value = '') => value.trim().toLowerCase();

const UserHistoryPage = () => {
  const location = useLocation();
  const routeState = location.state || {};
  const navigate = useNavigate();
  const [user, setUser] = useState(routeState.currentUser ?? null);
  const [isAdmin, setIsAdmin] = useState(Boolean(routeState.isAdmin));
  const [codigoEstudiante, setCodigoEstudiante] = useState('');
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState(null);
  const [methodFilter, setMethodFilter] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    if (routeState.currentUser && routeState.isAdmin) {
      setUser(routeState.currentUser);
      setIsAdmin(true);
      setLoading(false);
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        const currentEmail = normalizeEmail(currentUser.email);
        const authorized = Boolean(currentEmail && ADMIN_EMAILS.some((email) => normalizeEmail(email) === currentEmail));
        setIsAdmin(authorized);

        if (!authorized) {
          setSessions([]);
          setLoading(false);
          return;
        }

        const snap = await getDoc(doc(db, 'usuarios_registrados', currentUser.uid));
        if (snap.exists()) setCodigoEstudiante(snap.data().codigo ?? '');
        
        // Cargar historial de sesiones
        try {
          const sessionsData = await getSessionsHistory();
          setSessions(sessionsData);
        } catch (error) {
          console.error('Error al cargar sesiones:', error);
          setSessions([]);
        }
      } else {
        navigate('/login');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [navigate, routeState.currentUser, routeState.isAdmin]);

  const displayName = user?.displayName || user?.email?.split('@')[0] || 'Usuario';

  // Filtrar y buscar sesiones
  const filteredSessions = useMemo(() => {
    let result = [...sessions];

    // Filtro de búsqueda
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((session) => {
        const fullName = `${session.nombre || ''} ${session.apellido || ''}`.toLowerCase();
        const email = (session.email || '').toLowerCase();
        const codigo = (session.codigo || '').toLowerCase();
        return fullName.includes(query) || email.includes(query) || codigo.includes(query);
      });
    }

    // Filtro de estado
    if (statusFilter) {
      result = result.filter((session) => session.status === statusFilter);
    }

    // Filtro de método
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

  // Paginación
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

  useEffect(() => {
    if (!loading && !isAdmin && user) {
      navigate('/dashboard', { replace: true });
    }
  }, [loading, isAdmin, navigate, user]);

  if (loading) {
    return null;
  }

  if (!isAdmin) {
    return null;
  }

  const handleLogout = async () => {
    try {
      // Finalizar la sesión activa del usuario actual
      if (user) {
        const activeSessions = sessions.filter((s) => s.uid === user.uid && s.status === 'activo');
        await Promise.all(activeSessions.map((s) => updateSessionExit(s.id, Date.now())));
      }
    } catch (error) {
      console.error('Error al finalizar sesión:', error);
    }
    
    await signOut(auth);
    navigate('/login');
  };

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

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f6f8fc] text-slate-900 selection:bg-blue-200">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-8rem] top-[-6rem] h-72 w-72 rounded-full bg-blue-500/12 blur-3xl" />
        <div className="absolute right-[-7rem] top-40 h-80 w-80 rounded-full bg-blue-400/10 blur-3xl" />
        <div className="absolute bottom-[-6rem] left-1/3 h-72 w-72 rounded-full bg-blue-600/10 blur-3xl" />
      </div>

      <header className="fixed left-0 right-0 top-0 z-50 hidden h-16 items-center justify-between border-b border-blue-100/70 bg-white/80 px-6 shadow-[0_10px_30px_rgba(37,99,235,0.06)] backdrop-blur-2xl md:flex">
        <span className="font-['Space_Grotesk'] text-2xl font-black bg-gradient-to-r from-blue-700 to-blue-500 bg-clip-text text-transparent">
          CODECOMP
        </span>

        <div className="flex items-center gap-3">
          <button className="flex h-9 w-9 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600">
            <BellIcon />
          </button>
          <div className="flex items-center gap-2">
            <div className="relative rounded-full p-0.5 bg-gradient-to-tr from-blue-700 to-blue-400">
              <Avatar user={user} size="sm" />
            </div>
            <div className="hidden lg:flex lg:flex-col">
              <span className="font-['Space_Grotesk'] text-sm font-bold leading-tight text-slate-900">{displayName}</span>
              <span className="font-['Space_Grotesk'] text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Estudiante{codigoEstudiante ? ` / ${codigoEstudiante}` : ''}
              </span>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 font-['Space_Grotesk'] text-xs font-bold text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
            >
              <LogoutIcon />
              Salir
            </button>
          </div>
        </div>
      </header>

      <nav className="fixed left-0 top-0 z-40 hidden h-full w-64 flex-col border-r border-blue-100/70 bg-white/80 px-4 pb-8 pt-24 shadow-[0_18px_50px_rgba(37,99,235,0.08)] backdrop-blur-2xl md:flex">
        <div className="mb-6 flex items-center gap-3 px-2">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg shadow-lg">
            <img src="/vite.svg" alt="CODECOMP logo" className="h-full w-full object-contain" />
          </div>
          <div>
            <h2 className="font-['Space_Grotesk'] text-lg font-bold text-slate-900">CODECOMP</h2>
            <p className="font-['Space_Grotesk'] text-[10px] font-bold uppercase tracking-wider text-slate-500">Programa Ingenieria de Sistemas UFPSO</p>
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-1">
          <NavItem icon={<HomeIcon />} label="Inicio" to="/dashboard" />
          <NavItem icon={<TrophyIcon />} label="Retos Diarios" to="/dashboard/retos" />
          <NavItem icon={<TournamentIcon />} label="Torneos" to="/dashboard/torneos" />
          <NavItem icon={<GruposIcon />} label="Grupos" to="/dashboard/grupos" />
          <NavItem icon={<LeaderboardIcon />} label="Rankings" to="#" />
          <div className="flex items-center gap-3 rounded-lg border-r-4 border-blue-600 bg-blue-50 px-4 py-3 font-['Space_Grotesk'] text-sm font-bold text-blue-700">
            <HistoryIcon />
            Usuarios
          </div>
        </div>

        <NavItem icon={<SettingsIcon />} label="Configuración" to="/reset" />
      </nav>

      <main className="relative min-h-screen px-4 pb-16 pt-24 md:pl-72 md:pr-8">
        <div className="mx-auto max-w-6xl">
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

              {visiblePageNumbers.map((pageNum) => {
                return (
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
                );
              })}

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
      </main>
    </div>
  );
};

export default UserHistoryPage;