import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { auth, db, hasFirebaseConfig } from '../firebase/firebaseConfig';
import { ADMIN_EMAILS } from '../config';

const DateIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 2v3m8-3v3M3 9h18M5 5h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z" />
  </svg>
);

const CupIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 21h8m-4-4v4m0-4a6 6 0 006-6V5H6v6a6 6 0 006 6zm0 0a6 6 0 01-6-6V5m12 0h2a2 2 0 012 2v1a3 3 0 01-3 3h-1m-14 0H3a3 3 0 01-3-3V7a2 2 0 012-2h2" />
  </svg>
);

const PlusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m-7-7h14" />
  </svg>
);

const EditIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 3.487a2.1 2.1 0 113 2.971L7.5 18.82 3 20l1.18-4.5L16.862 3.487z" />
  </svg>
);

const DeleteIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 7h12m-9 0V5a1 1 0 011-1h4a1 1 0 011 1v2m-7 0h10l-1 13a2 2 0 01-2 2H9a2 2 0 01-2-2L6 7z" />
  </svg>
);

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

const AIIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-white" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2l1.09 3.26L16 5l-2.91.74L12 9l-1.09-3.26L8 5l2.91-.74L12 2zm6 6l.73 2.18L21 11l-2.27.82L18 14l-.73-2.18L15 11l2.27-.82L18 8zM6 8l.73 2.18L9 11l-2.27.82L6 14l-.73-2.18L3 11l2.27-.82L6 8zm6 6l1.09 3.26L16 18l-2.91.74L12 22l-1.09-3.26L8 18l2.91-.74L12 14z" />
  </svg>
);

const NavItem = ({ icon, label, to, active = false }) => {
  if (active) {
    return (
      <div className="flex items-center gap-3 rounded-lg border-r-4 border-blue-600 bg-blue-50 px-4 py-3 font-['Space_Grotesk'] text-sm font-bold text-blue-700">
        {icon}
        {label}
      </div>
    );
  }

  return (
    <Link
      to={to}
      className="flex items-center gap-3 rounded-lg px-4 py-3 font-['Space_Grotesk'] text-sm font-semibold text-slate-500 transition-all duration-200 hover:translate-x-1 hover:bg-slate-50 hover:text-slate-900"
    >
      {icon}
      {label}
    </Link>
  );
};

const Avatar = ({ user, photoURL: explicitPhoto, size = 'md' }) => {
  const initial = (user?.displayName || user?.email || '?')[0].toUpperCase();
  const sizeClasses = size === 'lg'
    ? 'h-24 w-24 text-3xl border-4'
    : 'h-8 w-8 text-sm border-2';
  const photoURL = explicitPhoto || user?.photoURL || null;

  if (photoURL) {
    return (
      <img
        alt={user?.displayName || 'Avatar'}
        className={`${sizeClasses} rounded-full border-white object-cover shadow-sm`}
        src={photoURL}
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
  active: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  draft: 'border-amber-200 bg-amber-50 text-amber-700',
  completed: 'border-slate-200 bg-slate-100 text-slate-700',
  cancelled: 'border-rose-200 bg-rose-50 text-rose-700',
  full: 'border-rose-200 bg-rose-50 text-rose-700',
};

const statusLabels = {
  active: 'Activo',
  draft: 'Borrador',
  completed: 'Completado',
  cancelled: 'Cancelado',
  full: 'Completo',
};

const tournamentStatusOptions = [
  { value: 'draft', label: 'Borrador' },
  { value: 'active', label: 'Activo' },
  { value: 'completed', label: 'Completado' },
  { value: 'cancelled', label: 'Cancelado' },
];

const formatDate = (value) => {
  if (!value) return 'Sin fecha';

  const parsedDate = value?.toDate ? value.toDate() : new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return 'Fecha inválida';
  }

  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(parsedDate);
};

const normalizeEmail = (value) => value?.trim().toLowerCase() || '';

const createInitialTournamentForm = () => ({
  title: '',
  description: '',
  rules: '',
  location: '',
  registrationDeadline: '',
  startDate: '',
  endDate: '',
  maxTeams: '',
  status: 'active',
});

const formatDateForInput = (value) => {
  if (!value) return '';

  const parsedDate = value?.toDate ? value.toDate() : new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return '';
  }

  const pad = (number) => String(number).padStart(2, '0');
  return `${parsedDate.getFullYear()}-${pad(parsedDate.getMonth() + 1)}-${pad(parsedDate.getDate())}T${pad(parsedDate.getHours())}:${pad(parsedDate.getMinutes())}`;
};

const mapTournamentToFormData = (tournament) => ({
  title: tournament?.title || '',
  description: tournament?.description || '',
  rules: tournament?.rules || '',
  location: tournament?.location || '',
  registrationDeadline: formatDateForInput(tournament?.registrationDeadline),
  startDate: formatDateForInput(tournament?.startDate),
  endDate: formatDateForInput(tournament?.endDate),
  maxTeams: tournament?.maxTeams?.toString() || '',
  status: tournament?.status || 'active',
});

const validateTournamentForm = (formData) => {
  const nextErrors = {};
  const requiredFields = [
    'title',
    'description',
    'rules',
    'location',
    'registrationDeadline',
    'startDate',
    'endDate',
    'maxTeams',
    'status',
  ];

  requiredFields.forEach((fieldName) => {
    if (!formData[fieldName]?.toString().trim()) {
      nextErrors[fieldName] = 'Este campo es obligatorio.';
    }
  });

  const startDate = formData.startDate ? new Date(formData.startDate) : null;
  const endDate = formData.endDate ? new Date(formData.endDate) : null;
  const registrationDeadline = formData.registrationDeadline ? new Date(formData.registrationDeadline) : null;
  const maxTeamsValue = Number(formData.maxTeams);

  if (startDate && endDate && startDate.getTime() >= endDate.getTime()) {
    nextErrors.startDate = 'La fecha de inicio debe ser anterior a la fecha de fin.';
    nextErrors.endDate = 'La fecha de fin debe ser posterior a la fecha de inicio.';
  }

  if (formData.title.trim().length > 80) {
    nextErrors.title = 'El título no debe superar 80 caracteres.';
  }

  if (formData.location.trim().length > 80) {
    nextErrors.location = 'La ubicación no debe superar 80 caracteres.';
  }

  if (formData.description.trim().length > 300) {
    nextErrors.description = 'La descripción no debe superar 300 caracteres.';
  }

  if (formData.rules.trim().length > 500) {
    nextErrors.rules = 'Las reglas no deben superar 500 caracteres.';
  }

  if (registrationDeadline && startDate && registrationDeadline.getTime() >= startDate.getTime()) {
    nextErrors.registrationDeadline = 'La inscripción debe cerrar antes del inicio del torneo.';
  }

  if (!Number.isInteger(maxTeamsValue) || maxTeamsValue <= 0) {
    nextErrors.maxTeams = 'El cupo máximo debe ser un número entero mayor a 0.';
  } else if (maxTeamsValue > 99) {
    nextErrors.maxTeams = 'El cupo máximo no puede superar 99 para mantener grupos de 3 y no exceder 100 personas.';
  } else if (maxTeamsValue % 3 !== 0) {
    nextErrors.maxTeams = 'El cupo máximo debe ser múltiplo de 3 para formar equipos completos.';
  }

  if (!tournamentStatusOptions.some((option) => option.value === formData.status)) {
    nextErrors.status = 'Selecciona un estado válido.';
  }

  return nextErrors;
};

const getRegisteredTeamsCount = (tournament) => (Array.isArray(tournament?.registeredTeams) ? tournament.registeredTeams.length : 0);

const getMaxTeamsValue = (tournament) => {
  const maxTeams = Number(tournament?.maxTeams);
  return Number.isFinite(maxTeams) && maxTeams > 0 ? maxTeams : null;
};

const isTournamentFull = (tournament) => {
  const maxTeams = getMaxTeamsValue(tournament);
  if (!maxTeams) return false;

  return getRegisteredTeamsCount(tournament) >= maxTeams;
};

const getTournamentDisplayStatus = (tournament) => {
  const status = tournament?.status || 'draft';

  if (status !== 'active') {
    return status;
  }

  if (isTournamentFull(tournament)) return 'full';
  return status;
};

const canEditTournament = (tournament) => ['draft', 'active'].includes(tournament?.status || 'draft');

const canDeleteTournament = (tournament) => (tournament?.status || 'draft') === 'draft';

const shouldAutoCancelTournament = (tournament, now = new Date()) => {
  if (!tournament || tournament.status !== 'active') return false;

  const registrationDeadline = tournament.registrationDeadline ? new Date(tournament.registrationDeadline) : null;
  if (!registrationDeadline || Number.isNaN(registrationDeadline.getTime())) return false;

  return registrationDeadline.getTime() <= now.getTime() && getRegisteredTeamsCount(tournament) < 2;
};

const TournamentDate = ({ label, value }) => (
  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
    <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
      <DateIcon />
      {label}
    </div>
    <div className="mt-1 text-sm font-semibold text-slate-800">{formatDate(value)}</div>
  </div>
);

const TournamentForm = ({ mode, tournament, isSubmitting, onCancel, onSubmit }) => {
  const [formData, setFormData] = useState(() => (
    mode === 'edit' && tournament ? mapTournamentToFormData(tournament) : createInitialTournamentForm()
  ));
  const [formErrors, setFormErrors] = useState({});
  const [formMessage, setFormMessage] = useState('');

  useEffect(() => {
    if (mode === 'edit' && tournament) {
      setFormData(mapTournamentToFormData(tournament));
    } else {
      setFormData(createInitialTournamentForm());
    }

    setFormErrors({});
    setFormMessage('');
  }, [mode, tournament]);

  const handleTournamentFieldChange = (event) => {
    const { name, value } = event.target;
    setFormData((currentValue) => ({
      ...currentValue,
      [name]: value,
    }));

    setFormErrors((currentErrors) => {
      if (!currentErrors[name]) return currentErrors;

      const nextErrors = { ...currentErrors };
      delete nextErrors[name];
      return nextErrors;
    });

    setFormMessage('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const validationErrors = validateTournamentForm(formData);
    setFormErrors(validationErrors);
    setFormMessage('');

    if (Object.keys(validationErrors).length > 0) {
      setFormMessage('Corrige los campos marcados para continuar.');
      return;
    }

    try {
      await onSubmit(formData);
    } catch (saveError) {
      setFormMessage(saveError?.message || 'No fue posible guardar el torneo.');
    }
  };

  const isEditMode = mode === 'edit';
  const title = isEditMode ? 'Editar torneo' : 'Nuevo torneo';
  const subtitle = isEditMode
    ? 'Actualiza la información del torneo y conserva el estado operativo que corresponda.'
    : 'Completa los datos del torneo. El registro se guardará en Firestore con la configuración elegida.';

  return (
    <div className="mb-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-gradient-to-r from-slate-900 via-slate-800 to-blue-900 px-6 py-5 text-white sm:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-100">{isEditMode ? 'Actualizar torneo' : 'Nuevo torneo'}</p>
        <h2 className="mt-2 text-2xl font-bold tracking-tight">{title}</h2>
        <p className="mt-2 max-w-2xl text-sm text-slate-200">{subtitle}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 p-6 sm:p-8">
        {formMessage ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
            {formMessage}
          </div>
        ) : null}

        <div className="grid gap-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-semibold text-slate-700" htmlFor="title">
              Título
            </label>
            <input
              id="title"
              name="title"
              type="text"
              maxLength={80}
              value={formData.title}
              onChange={handleTournamentFieldChange}
              aria-invalid={Boolean(formErrors.title)}
              className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition focus:ring-4 ${formErrors.title ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-100' : 'border-slate-200 focus:border-blue-500 focus:ring-blue-100'}`}
              placeholder="Torneo Interno UFPSO - Semestre I"
            />
            {formErrors.title ? <p className="mt-2 text-xs font-medium text-rose-600">{formErrors.title}</p> : null}
          </div>

          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-semibold text-slate-700" htmlFor="description">
              Descripción
            </label>
            <textarea
              id="description"
              name="description"
              rows="4"
              maxLength={300}
              value={formData.description}
              onChange={handleTournamentFieldChange}
              aria-invalid={Boolean(formErrors.description)}
              className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition focus:ring-4 ${formErrors.description ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-100' : 'border-slate-200 focus:border-blue-500 focus:ring-blue-100'}`}
              placeholder="Competencia enfocada en algoritmos sobre grafos y optimización."
            />
            {formErrors.description ? <p className="mt-2 text-xs font-medium text-rose-600">{formErrors.description}</p> : null}
          </div>

          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-semibold text-slate-700" htmlFor="rules">
              Reglas
            </label>
            <textarea
              id="rules"
              name="rules"
              rows="4"
              maxLength={500}
              value={formData.rules}
              onChange={handleTournamentFieldChange}
              aria-invalid={Boolean(formErrors.rules)}
              className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition focus:ring-4 ${formErrors.rules ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-100' : 'border-slate-200 focus:border-blue-500 focus:ring-blue-100'}`}
              placeholder="Formato ICPC. Se permite material impreso. Lenguajes: C++, Java, Python."
            />
            {formErrors.rules ? <p className="mt-2 text-xs font-medium text-rose-600">{formErrors.rules}</p> : null}
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700" htmlFor="location">
              Ubicación
            </label>
            <input
              id="location"
              name="location"
              type="text"
              maxLength={80}
              value={formData.location}
              onChange={handleTournamentFieldChange}
              aria-invalid={Boolean(formErrors.location)}
              className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition focus:ring-4 ${formErrors.location ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-100' : 'border-slate-200 focus:border-blue-500 focus:ring-blue-100'}`}
              placeholder="Laboratorio de Sistemas 3 - UFPSO"
            />
            {formErrors.location ? <p className="mt-2 text-xs font-medium text-rose-600">{formErrors.location}</p> : null}
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700" htmlFor="maxTeams">
              Cupo máximo
            </label>
            <input
              id="maxTeams"
              name="maxTeams"
              type="number"
              min="3"
              max="99"
              step="3"
              value={formData.maxTeams}
              onChange={handleTournamentFieldChange}
              aria-invalid={Boolean(formErrors.maxTeams)}
              className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition focus:ring-4 ${formErrors.maxTeams ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-100' : 'border-slate-200 focus:border-blue-500 focus:ring-blue-100'}`}
              placeholder="30"
            />
            <p className="mt-2 text-xs text-slate-500">Debe ser un múltiplo de 3, entre 3 y 99.</p>
            {formErrors.maxTeams ? <p className="mt-2 text-xs font-medium text-rose-600">{formErrors.maxTeams}</p> : null}
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700" htmlFor="status">
              Estado
            </label>
            <select
              id="status"
              name="status"
              value={formData.status}
              onChange={handleTournamentFieldChange}
              aria-invalid={Boolean(formErrors.status)}
              className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition focus:ring-4 ${formErrors.status ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-100' : 'border-slate-200 focus:border-blue-500 focus:ring-blue-100'}`}
            >
              {tournamentStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {formErrors.status ? <p className="mt-2 text-xs font-medium text-rose-600">{formErrors.status}</p> : null}
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700" htmlFor="registrationDeadline">
              Fecha de inscripción
            </label>
            <input
              id="registrationDeadline"
              name="registrationDeadline"
              type="datetime-local"
              value={formData.registrationDeadline}
              onChange={handleTournamentFieldChange}
              aria-invalid={Boolean(formErrors.registrationDeadline)}
              className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition focus:ring-4 ${formErrors.registrationDeadline ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-100' : 'border-slate-200 focus:border-blue-500 focus:ring-blue-100'}`}
            />
            {formErrors.registrationDeadline ? <p className="mt-2 text-xs font-medium text-rose-600">{formErrors.registrationDeadline}</p> : null}
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700" htmlFor="startDate">
              Fecha de inicio
            </label>
            <input
              id="startDate"
              name="startDate"
              type="datetime-local"
              value={formData.startDate}
              onChange={handleTournamentFieldChange}
              aria-invalid={Boolean(formErrors.startDate)}
              className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition focus:ring-4 ${formErrors.startDate ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-100' : 'border-slate-200 focus:border-blue-500 focus:ring-blue-100'}`}
            />
            {formErrors.startDate ? <p className="mt-2 text-xs font-medium text-rose-600">{formErrors.startDate}</p> : null}
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700" htmlFor="endDate">
              Fecha de fin
            </label>
            <input
              id="endDate"
              name="endDate"
              type="datetime-local"
              value={formData.endDate}
              onChange={handleTournamentFieldChange}
              aria-invalid={Boolean(formErrors.endDate)}
              className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition focus:ring-4 ${formErrors.endDate ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-100' : 'border-slate-200 focus:border-blue-500 focus:ring-blue-100'}`}
            />
            {formErrors.endDate ? <p className="mt-2 text-xs font-medium text-rose-600">{formErrors.endDate}</p> : null}
          </div>
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <PlusIcon />
            {isSubmitting ? 'Guardando...' : isEditMode ? 'Actualizar torneo' : 'Guardar torneo'}
          </button>
        </div>
      </form>
    </div>
  );
};

const TournamentsPage = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [codigoEstudiante, setCodigoEstudiante] = useState('');
  const [storedPhotoURL, setStoredPhotoURL] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [formMode, setFormMode] = useState(null);
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [isSavingTournament, setIsSavingTournament] = useState(false);
  const [pendingDeleteTournament, setPendingDeleteTournament] = useState(null);
  const [isDeletingTournament, setIsDeletingTournament] = useState(false);
  const [deleteModalError, setDeleteModalError] = useState('');

  const currentEmail = normalizeEmail(currentUser?.email);
  const isAdmin = Boolean(currentEmail && ADMIN_EMAILS.some((email) => normalizeEmail(email) === currentEmail));

  const loadTournaments = useCallback(async () => {
    if (!hasFirebaseConfig || !db) {
      setError('Configura Firebase para cargar los torneos.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');

      const tournamentsRef = collection(db, 'tournaments');
      const tournamentsQuery = isAdmin
        ? tournamentsRef
        : query(tournamentsRef, where('status', '==', 'active'));

      const snapshot = await getDocs(tournamentsQuery);
      const items = snapshot.docs.map((document) => ({ id: document.id, ...document.data() }));

      const now = new Date();
      const autoCancelledTournaments = items.filter((tournament) => shouldAutoCancelTournament(tournament, now));

      if (autoCancelledTournaments.length > 0) {
        await Promise.all(
          autoCancelledTournaments.map((tournament) => updateDoc(doc(db, 'tournaments', tournament.id), {
            status: 'cancelled',
            updatedAt: serverTimestamp(),
          }))
        );
      }

      const visibleItems = items
        .map((tournament) => (
          autoCancelledTournaments.some((autoCancelledTournament) => autoCancelledTournament.id === tournament.id)
            ? { ...tournament, status: 'cancelled' }
            : tournament
        ))
        .filter((tournament) => isAdmin || tournament.status === 'active')
        .sort((left, right) => {
          const leftDate = new Date(left.startDate || 0).getTime();
          const rightDate = new Date(right.startDate || 0).getTime();
          return leftDate - rightDate;
        });

      setTournaments(visibleItems);
    } catch (fetchError) {
      setError('No fue posible cargar los torneos.');
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthReady(true);

      if (!user) {
        navigate('/login');
        return;
      }

      if (!hasFirebaseConfig || !db) {
        return;
      }

      const loadProfile = async () => {
        try {
          const snapshot = await getDoc(doc(db, 'usuarios_registrados', user.uid));
          if (snapshot.exists()) {
            const data = snapshot.data();
            setCodigoEstudiante(data.codigo ?? '');
            setStoredPhotoURL(data.photoURL ?? null);
          }
        } catch (profileError) {
          setCodigoEstudiante('');
          setStoredPhotoURL(null);
        }
      };

      loadProfile();
    });

    return () => unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await signOut(auth);
      navigate('/login');
    } catch (logoutError) {
      console.error('Error al cerrar sesión:', logoutError);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleCreateToggle = () => {
    setSelectedTournament(null);
    setPendingDeleteTournament(null);
    setDeleteModalError('');
    setFormMode((currentValue) => (currentValue === 'create' ? null : 'create'));
  };

  const handleCreateCancel = () => {
    setFormMode(null);
    setSelectedTournament(null);
  };

  const handleEditTournament = (tournament) => {
    if (!canEditTournament(tournament)) return;

    setSelectedTournament(tournament);
    setPendingDeleteTournament(null);
    setDeleteModalError('');
    setFormMode('edit');
  };

  const handleSaveTournament = async (formData) => {
    if (!hasFirebaseConfig || !db) {
      throw new Error('Configura Firebase antes de guardar el torneo.');
    }

    setIsSavingTournament(true);

    try {
      const tournamentRef = selectedTournament ? doc(db, 'tournaments', selectedTournament.id) : null;
      const tournamentPayload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        rules: formData.rules.trim(),
        location: formData.location.trim(),
        registrationDeadline: new Date(formData.registrationDeadline).toISOString(),
        startDate: new Date(formData.startDate).toISOString(),
        endDate: new Date(formData.endDate).toISOString(),
        status: formData.status,
        maxTeams: Number(formData.maxTeams),
        updatedAt: serverTimestamp(),
      };

      if (selectedTournament && tournamentRef) {
        await updateDoc(tournamentRef, tournamentPayload);
      } else {
        await addDoc(collection(db, 'tournaments'), {
          ...tournamentPayload,
          registeredTeams: [],
          createdBy: currentUser?.email || '',
          createdAt: serverTimestamp(),
        });
      }

      await loadTournaments();
      setFormMode(null);
      setSelectedTournament(null);
      setError('');
    } catch (saveError) {
      console.error('Error al crear torneo:', saveError);
      if (saveError?.code === 'permission-denied') {
        throw new Error('Firestore bloqueó la operación. Verifica las reglas y tus permisos de administrador.');
      }

      throw new Error('No fue posible guardar el torneo. Intenta de nuevo.');
    } finally {
      setIsSavingTournament(false);
    }
  };

  const handleDeleteClick = (tournament) => {
    if (!canDeleteTournament(tournament)) return;

    setSelectedTournament(null);
    setFormMode(null);
    setDeleteModalError('');
    setPendingDeleteTournament(tournament);
  };

  const handleDeleteCancel = () => {
    setPendingDeleteTournament(null);
    setDeleteModalError('');
  };

  const handleDeleteConfirm = async () => {
    if (!pendingDeleteTournament) return;

    if (!hasFirebaseConfig || !db) {
      setDeleteModalError('Configura Firebase antes de eliminar el torneo.');
      return;
    }

    setIsDeletingTournament(true);

    try {
      const tournamentRef = doc(db, 'tournaments', pendingDeleteTournament.id);
      const snapshot = await getDoc(tournamentRef);

      if (!snapshot.exists()) {
        throw new Error('El torneo ya no existe.');
      }

      const tournamentData = snapshot.data();
      const registeredTeamsCount = Array.isArray(tournamentData.registeredTeams) ? tournamentData.registeredTeams.length : 0;

      if (registeredTeamsCount === 0) {
        await deleteDoc(tournamentRef);
      } else {
        await updateDoc(tournamentRef, {
          status: 'cancelled',
          updatedAt: serverTimestamp(),
        });
      }

      await loadTournaments();
      setPendingDeleteTournament(null);
      setDeleteModalError('');
      setError('');
    } catch (deleteError) {
      console.error('Error al eliminar torneo:', deleteError);
      setDeleteModalError(deleteError?.message || 'No fue posible eliminar el torneo.');
    } finally {
      setIsDeletingTournament(false);
    }
  };

  useEffect(() => {
    if (!authReady || !currentUser) return;
    loadTournaments();
  }, [authReady, currentUser, loadTournaments]);

  const totalRegisteredTeams = tournaments.reduce((total, tournament) => {
    const registeredTeams = Array.isArray(tournament.registeredTeams) ? tournament.registeredTeams.length : 0;
    return total + registeredTeams;
  }, 0);

  const activeTournaments = tournaments.filter((tournament) => tournament.status === 'active').length;
  const draftTournaments = tournaments.filter((tournament) => tournament.status === 'draft').length;
  const fullTournaments = tournaments.filter((tournament) => isTournamentFull(tournament)).length;
  const cancelledTournaments = tournaments.filter((tournament) => tournament.status === 'cancelled').length;
  const hasConfiguredCapacity = tournaments.some((tournament) => Number.isFinite(Number(tournament.maxTeams)));
  const totalCapacity = tournaments.reduce((total, tournament) => {
    const maxTeams = Number(tournament.maxTeams);
    return total + (Number.isFinite(maxTeams) ? maxTeams : 0);
  }, 0);
  const publicTournaments = tournaments.filter((tournament) => tournament.status === 'active' && !isTournamentFull(tournament));
  const openSlots = publicTournaments.reduce((total, tournament) => {
    const maxTeams = getMaxTeamsValue(tournament);
    if (!maxTeams) return total;

    return total + Math.max(maxTeams - getRegisteredTeamsCount(tournament), 0);
  }, 0);
  const featuredTournament = !isAdmin ? publicTournaments[0] || null : null;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-blue-200">
      <header className="fixed left-0 right-0 top-0 z-50 hidden h-16 items-center justify-between border-b border-slate-200 bg-white/80 px-6 shadow-sm backdrop-blur-xl md:flex">
        <span className="font-['Space_Grotesk'] text-2xl font-black bg-gradient-to-r from-blue-700 to-blue-500 bg-clip-text text-transparent">
          CODECOMP
        </span>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-full border border-blue-100 bg-gradient-to-r from-blue-50 to-violet-50 px-3 py-1.5">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-violet-500">
              <AIIcon />
            </span>
            <span className="font-['Space_Grotesk'] text-sm font-bold text-blue-700">Asistente IA</span>
          </div>
          <button className="flex h-9 w-9 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600">
            <BellIcon />
          </button>
          <div className="flex items-center gap-2">
            <div className="relative rounded-full p-0.5 bg-gradient-to-tr from-blue-700 to-blue-400">
              <Avatar user={currentUser} photoURL={storedPhotoURL} size="sm" />
            </div>
            <div className="hidden lg:flex lg:flex-col">
              <span className="font-['Space_Grotesk'] text-sm font-bold leading-tight text-slate-900">{currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Usuario'}</span>
              <span className="font-['Space_Grotesk'] text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Estudiante{codigoEstudiante ? ` / ${codigoEstudiante}` : ''}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 font-['Space_Grotesk'] text-xs font-bold text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <LogoutIcon />
            {isLoggingOut ? '...' : 'Salir'}
          </button>
        </div>
      </header>

      <nav className="fixed left-0 top-0 z-40 hidden h-full w-64 flex-col border-r border-slate-200 bg-white/80 px-4 pb-8 pt-24 shadow-xl backdrop-blur-xl md:flex">
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
          <NavItem icon={<TournamentIcon />} label="Torneos" to="/dashboard/torneos" active />
          <NavItem icon={<GruposIcon />} label="Grupos" to="/dashboard/grupos" />
          <NavItem icon={<LeaderboardIcon />} label="Rankings" to="#" />
          {isAdmin && <NavItem icon={<HistoryIcon />} label="Usuarios" to="/historial-usuarios" />}
        </div>

        <NavItem icon={<SettingsIcon />} label="Configuración" to="/reset" />
      </nav>

      <main className="min-h-screen px-4 pb-16 pt-24 md:pl-72 md:pr-8">
        <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-blue-600">
              Gestión de torneos
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Torneos</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Consulta la oferta de torneos disponibles y administra su ciclo de vida desde una vista limpia y centralizada.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {isAdmin ? (
              <button
                type="button"
                onClick={handleCreateToggle}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
              >
                <PlusIcon />
                {formMode === 'create' ? 'Cerrar formulario' : 'Crear Torneo'}
              </button>
            ) : null}
          </div>
        </div>

        {isAdmin && formMode ? (
          <TournamentForm
            mode={formMode}
            tournament={selectedTournament}
            isSubmitting={isSavingTournament}
            onCancel={handleCreateCancel}
            onSubmit={handleSaveTournament}
          />
        ) : null}

        {isAdmin ? (
          <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">Panel administrativo</p>
                <h2 className="mt-1 text-lg font-bold text-slate-900">Indicadores de gestión</h2>
              </div>
              <p className="text-sm text-slate-500">Resumen global de la colección tournaments</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Total de torneos</p>
                <p className="mt-3 text-3xl font-bold text-slate-900">{loading ? '...' : tournaments.length}</p>
              </div>
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-500">Torneos activos</p>
                <p className="mt-3 text-3xl font-bold text-emerald-700">{loading ? '...' : activeTournaments}</p>
              </div>
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-500">Torneos completos</p>
                <p className="mt-3 text-3xl font-bold text-rose-700">{loading ? '...' : fullTournaments}</p>
              </div>
              <div className="rounded-2xl border border-slate-300 bg-slate-100 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Torneos cancelados</p>
                <p className="mt-3 text-3xl font-bold text-slate-700">{loading ? '...' : cancelledTournaments}</p>
              </div>
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-500">Torneos borrador</p>
                <p className="mt-3 text-3xl font-bold text-amber-700">{loading ? '...' : draftTournaments}</p>
              </div>
              <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-500">Equipos inscritos</p>
                <p className="mt-3 text-3xl font-bold text-blue-700">{loading ? '...' : totalRegisteredTeams}</p>
                <p className="mt-1 text-xs text-blue-600">
                  Capacidad configurada: {loading ? '...' : hasConfiguredCapacity ? totalCapacity : 'No configurada'}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="mb-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="grid gap-0 lg:grid-cols-[1.5fr_1fr]">
              <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 px-6 py-6 text-white sm:px-8 sm:py-8">
                <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
                <div className="absolute -bottom-10 left-20 h-36 w-36 rounded-full bg-cyan-400/15 blur-3xl" />

                <div className="relative z-10 max-w-2xl">
                  <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    Vista pública
                  </div>

                  <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Torneos activos para competir ahora</h2>
                  <p className="mt-3 max-w-xl text-sm leading-6 text-slate-200 sm:text-base">
                    Explora las competencias abiertas, revisa fechas clave y elige el torneo que mejor se ajuste a tu equipo.
                  </p>

                  <div className="mt-5 flex flex-wrap gap-3">
                    <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur-sm">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-300">Disponibles</p>
                      <p className="mt-1 text-2xl font-bold text-white">{loading ? '...' : publicTournaments.length}</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur-sm">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-300">Cupos abiertos</p>
                      <p className="mt-1 text-2xl font-bold text-white">{loading ? '...' : openSlots}</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur-sm">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-300">Próximo cierre</p>
                      <p className="mt-1 text-lg font-bold text-white">{loading ? '...' : featuredTournament ? formatDate(featuredTournament.registrationDeadline) : 'Sin torneos'}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col justify-between gap-4 bg-slate-50 p-6 sm:p-8">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Próximo torneo disponible</p>
                  <h3 className="mt-2 text-xl font-bold text-slate-900">
                    {featuredTournament?.title || 'En breve se publicarán nuevos torneos'}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {featuredTournament
                      ? featuredTournament.description || 'Competencia activa lista para explorar.'
                      : 'Cuando haya torneos activos con cupo disponible, aparecerán aquí.'}
                  </p>
                </div>

                {featuredTournament ? (
                  <div className="grid gap-3">
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Ubicación</p>
                      <p className="mt-1 font-semibold text-slate-900">{featuredTournament.location || 'Por confirmar'}</p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Inscripción</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">{formatDate(featuredTournament.registrationDeadline)}</p>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Cupos</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">
                          {getRegisteredTeamsCount(featuredTournament)} / {getMaxTeamsValue(featuredTournament) ?? 'Sin límite'}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-600 shadow-sm">
                    No hay torneos activos con cupo disponible en este momento.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {error ? (
          <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-medium text-rose-700 shadow-sm">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-[320px] animate-pulse rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="h-4 w-24 rounded-full bg-slate-100" />
                <div className="mt-4 h-7 w-4/5 rounded-lg bg-slate-100" />
                <div className="mt-4 h-16 rounded-xl bg-slate-100" />
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="h-16 rounded-xl bg-slate-100" />
                  <div className="h-16 rounded-xl bg-slate-100" />
                  <div className="h-16 rounded-xl bg-slate-100" />
                </div>
                <div className="mt-4 h-12 rounded-xl bg-slate-100" />
              </div>
            ))}
          </div>
        ) : tournaments.length ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {tournaments.map((tournament) => {
              const registeredTeams = getRegisteredTeamsCount(tournament);
              const maxTeams = getMaxTeamsValue(tournament) ?? 'Sin límite';
              const status = getTournamentDisplayStatus(tournament);
              const statusLabel = statusLabels[status] || status;
              const editable = canEditTournament(tournament);
              const deletable = canDeleteTournament(tournament);

              return (
                <article
                  key={tournament.id}
                  className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
                >
                  <div className="h-1 bg-gradient-to-r from-blue-600 via-sky-500 to-cyan-400" />
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                          {tournament.location || 'Ubicación pendiente'}
                        </p>
                        <h2 className="mt-2 text-xl font-bold leading-tight text-slate-900">
                          {tournament.title || 'Torneo sin título'}
                        </h2>
                      </div>

                      <span className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold ${statusStyles[status] || statusStyles.draft}`}>
                        {statusLabel}
                      </span>
                    </div>

                    <p className="mt-4 line-clamp-3 text-sm leading-6 text-slate-600">
                      {tournament.description || 'Sin descripción disponible.'}
                    </p>

                    <div className="mt-5 grid gap-3">
                      <TournamentDate label="Inscripción hasta" value={tournament.registrationDeadline} />
                      <div className="grid gap-3 sm:grid-cols-2">
                        <TournamentDate label="Inicio" value={tournament.startDate} />
                        <TournamentDate label="Fin" value={tournament.endDate} />
                      </div>
                    </div>

                    <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <CupIcon />
                        <span>
                          Cupos: <span className="font-semibold text-slate-900">{registeredTeams}</span> / <span className="font-semibold text-slate-900">{maxTeams}</span>
                        </span>
                      </div>

                      {isAdmin && (editable || deletable) ? (
                        <div className="flex items-center gap-2">
                          {editable ? (
                            <button
                              type="button"
                              onClick={() => handleEditTournament(tournament)}
                              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                            >
                              <EditIcon />
                              Editar
                            </button>
                          ) : null}
                          {deletable ? (
                            <button
                              type="button"
                              onClick={() => handleDeleteClick(tournament)}
                              className="inline-flex items-center gap-2 rounded-lg border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
                            >
                              <DeleteIcon />
                              Eliminar
                            </button>
                          ) : null}
                        </div>
                      ) : isAdmin ? (
                        <p className="text-xs font-medium text-slate-400">Solo lectura</p>
                      ) : null}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center shadow-sm">
            <p className="text-lg font-semibold text-slate-900">No hay torneos para mostrar</p>
            <p className="mt-2 text-sm text-slate-500">
              {isAdmin
                ? 'Aún no se han creado registros en Firestore.'
                : 'Solo se muestran torneos activos y en este momento no hay ninguno disponible.'}
            </p>
          </div>
        )}
        {pendingDeleteTournament ? (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/70 px-4 py-6 backdrop-blur-sm">
            <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
              <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-blue-900 px-6 py-5 text-white">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-100">Confirmar eliminación</p>
                <h3 className="mt-2 text-2xl font-bold tracking-tight">Eliminar torneo</h3>
                <p className="mt-2 text-sm text-slate-200">
                  {pendingDeleteTournament.title || 'Este torneo'} será eliminado solo si no tiene equipos inscritos. Si ya hay registros, se cancelará sin borrar el documento.
                </p>
              </div>

              <div className="space-y-4 p-6">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Torneo</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{pendingDeleteTournament.title || 'Sin título'}</p>
                  <p className="mt-1 text-sm text-slate-600">Equipos inscritos: {getRegisteredTeamsCount(pendingDeleteTournament)}</p>
                </div>

                {deleteModalError ? (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                    {deleteModalError}
                  </div>
                ) : null}

                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={handleDeleteCancel}
                    disabled={isDeletingTournament}
                    className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteConfirm}
                    disabled={isDeletingTournament}
                    className="inline-flex items-center justify-center rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isDeletingTournament ? 'Procesando...' : 'Confirmar eliminación'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}
        </div>
      </main>
    </div>
  );
};

export default TournamentsPage;