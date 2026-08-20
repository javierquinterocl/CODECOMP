import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { auth, db, hasFirebaseConfig } from '../firebase/firebaseConfig';
import { ADMIN_EMAILS } from '../config';

const DateIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 2v3m8-3v3M3 9h18M5 5h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z" />
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
  archived: 'border-slate-200 bg-slate-100 text-slate-700',
};

const statusLabels = {
  active: 'Activo',
  draft: 'Borrador',
  archived: 'Archivado',
};

const difficultyOptions = [
  { value: 'beginner', label: 'Básico' },
  { value: 'intermediate', label: 'Intermedio' },
  { value: 'advanced', label: 'Avanzado' },
];

const challengeStatusOptions = [
  { value: 'active', label: 'Activo' },
  { value: 'draft', label: 'Borrador' },
  { value: 'archived', label: 'Archivado' },
];

const normalizeEmail = (value) => value?.trim().toLowerCase() || '';

const createInitialChallengeForm = () => ({
  title: '',
  description: '',
  difficulty: 'beginner',
  tags: '',
  status: 'active',
  publishedAt: '',
});

const formatDate = (value) => {
  if (!value) return 'Sin fecha';

  const date = value?.toDate ? value.toDate() : new Date(value);
  if (Number.isNaN(date.getTime())) return 'Fecha inválida';

  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

const formatDateForInput = (value) => {
  if (!value) return '';
  const date = value?.toDate ? value.toDate() : new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const mapChallengeToFormData = (challenge) => ({
  title: challenge?.title || '',
  description: challenge?.description || '',
  difficulty: challenge?.difficulty || 'beginner',
  tags: Array.isArray(challenge?.tags) ? challenge.tags.join(', ') : challenge?.tags || '',
  status: challenge?.status || 'active',
  publishedAt: formatDateForInput(challenge?.publishedAt),
});

const validateChallengeForm = (formData) => {
  const errors = {};
  if (!formData.title.trim()) errors.title = 'El título es obligatorio.';
  if (!formData.description.trim()) errors.description = 'La descripción es obligatoria.';
  if (!formData.difficulty) errors.difficulty = 'Selecciona una dificultad.';
  if (!formData.status) errors.status = 'Selecciona un estado.';

  const publishedDate = formData.publishedAt ? new Date(formData.publishedAt) : null;
  if (formData.publishedAt && Number.isNaN(publishedDate.getTime())) {
    errors.publishedAt = 'La fecha de publicación no es válida.';
  }

  return errors;
};

const ChallengeForm = ({ mode, challenge, isSubmitting, onCancel, onSubmit }) => {
  const [formData, setFormData] = useState(createInitialChallengeForm());
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (challenge) {
      setFormData(mapChallengeToFormData(challenge));
      return;
    }
    setFormData(createInitialChallengeForm());
  }, [challenge]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = validateChallengeForm(formData);
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }
    setErrors({});
    await onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">Panel administrativo</p>
          <h2 className="mt-2 text-2xl font-bold text-slate-900">{mode === 'edit' ? 'Editar reto' : 'Crear nuevo reto'}</h2>
          <p className="mt-2 text-sm text-slate-600">Administra los retos diarios y mantén la colección actualizada.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onCancel} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50">
            Cancelar
          </button>
          <button type="submit" disabled={isSubmitting} className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">
            {isSubmitting ? 'Guardando...' : mode === 'edit' ? 'Guardar cambios' : 'Crear reto'}
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <label className="text-sm font-semibold text-slate-900">Título</label>
          <input
            name="title"
            value={formData.title}
            onChange={handleChange}
            className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white"
          />
          {errors.title ? <p className="mt-2 text-xs text-rose-600">{errors.title}</p> : null}
        </div>

        <div>
          <label className="text-sm font-semibold text-slate-900">Dificultad</label>
          <select
            name="difficulty"
            value={formData.difficulty}
            onChange={handleChange}
            className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white"
          >
            {difficultyOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          {errors.difficulty ? <p className="mt-2 text-xs text-rose-600">{errors.difficulty}</p> : null}
        </div>

        <div className="lg:col-span-2">
          <label className="text-sm font-semibold text-slate-900">Descripción</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={5}
            className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white"
          />
          {errors.description ? <p className="mt-2 text-xs text-rose-600">{errors.description}</p> : null}
        </div>

        <div>
          <label className="text-sm font-semibold text-slate-900">Etiquetas (coma separadas)</label>
          <input
            name="tags"
            value={formData.tags}
            onChange={handleChange}
            className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white"
          />
        </div>

        <div>
          <label className="text-sm font-semibold text-slate-900">Estado</label>
          <select
            name="status"
            value={formData.status}
            onChange={handleChange}
            className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white"
          >
            {challengeStatusOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          {errors.status ? <p className="mt-2 text-xs text-rose-600">{errors.status}</p> : null}
        </div>

        <div>
          <label className="text-sm font-semibold text-slate-900">Fecha de publicación</label>
          <input
            type="datetime-local"
            name="publishedAt"
            value={formData.publishedAt}
            onChange={handleChange}
            className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white"
          />
          {errors.publishedAt ? <p className="mt-2 text-xs text-rose-600">{errors.publishedAt}</p> : null}
        </div>
      </div>
    </form>
  );
};

const DailyChallengesPage = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [codigoEstudiante, setCodigoEstudiante] = useState('');
  const [storedPhotoURL, setStoredPhotoURL] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [formMode, setFormMode] = useState(null);
  const [selectedChallenge, setSelectedChallenge] = useState(null);
  const [isSavingChallenge, setIsSavingChallenge] = useState(false);
  const [pendingDeleteChallenge, setPendingDeleteChallenge] = useState(null);
  const [isDeletingChallenge, setIsDeletingChallenge] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const currentEmail = normalizeEmail(currentUser?.email);
  const isAdmin = Boolean(currentEmail && ADMIN_EMAILS.some((email) => normalizeEmail(email) === currentEmail));

  const loadChallenges = useCallback(async () => {
    if (!hasFirebaseConfig || !db) {
      setError('Configura Firebase para cargar los retos.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');

      const challengesRef = collection(db, 'daily_challenges');
      const challengesQuery = isAdmin ? challengesRef : query(challengesRef, where('status', '==', 'active'));
      const snapshot = await getDocs(challengesQuery);
      const items = snapshot.docs.map((document) => ({ id: document.id, ...document.data() }));

      setChallenges(items.sort((left, right) => {
        const leftDate = left.publishedAt ? new Date(left.publishedAt).getTime() : 0;
        const rightDate = right.publishedAt ? new Date(right.publishedAt).getTime() : 0;
        return rightDate - leftDate;
      }));
    } catch (fetchError) {
      console.error('Error cargando retos:', fetchError);
      setError('No fue posible cargar los retos. Intenta de nuevo más tarde.');
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      setAuthReady(true);

      if (!user) {
        navigate('/login');
        return;
      }

      if (!hasFirebaseConfig || !db) return;

      try {
        const snapshot = await getDoc(doc(db, 'usuarios_registrados', user.uid));
        if (snapshot.exists()) {
          const data = snapshot.data();
          setCodigoEstudiante(data.codigo ?? '');
          setStoredPhotoURL(data.photoURL ?? null);
        }
      } catch (profileError) {
        console.error('Error leyendo perfil:', profileError);
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (!authReady || !currentUser) return;
    loadChallenges();
  }, [authReady, currentUser, loadChallenges]);

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
    setSelectedChallenge(null);
    setPendingDeleteChallenge(null);
    setDeleteError('');
    setFormMode((currentValue) => (currentValue === 'create' ? null : 'create'));
  };

  const handleEditChallenge = (challenge) => {
    if (!isAdmin) return;
    setSelectedChallenge(challenge);
    setPendingDeleteChallenge(null);
    setDeleteError('');
    setFormMode('edit');
  };

  const handleSaveChallenge = async (formData) => {
    if (!hasFirebaseConfig || !db) {
      throw new Error('Configura Firebase antes de guardar el reto.');
    }

    setIsSavingChallenge(true);
    try {
      const challengePayload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        difficulty: formData.difficulty,
        tags: formData.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
        status: formData.status,
        publishedAt: formData.publishedAt ? new Date(formData.publishedAt).toISOString() : serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      if (selectedChallenge) {
        const challengeRef = doc(db, 'daily_challenges', selectedChallenge.id);
        await updateDoc(challengeRef, challengePayload);
      } else {
        await addDoc(collection(db, 'daily_challenges'), {
          ...challengePayload,
          createdBy: currentUser?.email || '',
          createdAt: serverTimestamp(),
        });
      }

      await loadChallenges();
      setFormMode(null);
      setSelectedChallenge(null);
      setError('');
    } catch (saveError) {
      console.error('Error guardando reto:', saveError);
      if (saveError?.code === 'permission-denied') {
        throw new Error('Firestore bloqueó la operación. Verifica tus permisos de administrador.');
      }
      throw new Error('No fue posible guardar el reto. Intenta de nuevo.');
    } finally {
      setIsSavingChallenge(false);
    }
  };

  const handleDeleteChallenge = async (challenge) => {
    if (!isAdmin) return;
    const confirmed = window.confirm('¿Estás seguro de eliminar este reto? Esta acción no se puede deshacer.');
    if (!confirmed) return;

    setIsDeletingChallenge(true);
    setDeleteError('');
    try {
      const challengeRef = doc(db, 'daily_challenges', challenge.id);
      await deleteDoc(challengeRef);
      await loadChallenges();
    } catch (deleteError) {
      console.error('Error eliminando reto:', deleteError);
      setDeleteError('No fue posible eliminar el reto. Intenta de nuevo.');
    } finally {
      setIsDeletingChallenge(false);
    }
  };

  const totalChallenges = challenges.length;
  const activeChallenges = challenges.filter((item) => item.status === 'active').length;
  const draftChallenges = challenges.filter((item) => item.status === 'draft').length;
  const archivedChallenges = challenges.filter((item) => item.status === 'archived').length;

  const displayName = currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Usuario';
  const firstName = displayName.split(' ')[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches';

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
              <span className="font-['Space_Grotesk'] text-sm font-bold leading-tight text-slate-900">{displayName}</span>
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
          <NavItem icon={<TrophyIcon />} label="Retos Diarios" to="/dashboard/retos" active />
          <NavItem icon={<TournamentIcon />} label="Torneos" to="/dashboard/torneos" />
          <NavItem icon={<GruposIcon />} label="Grupos" to="/dashboard/grupos" />
          <NavItem icon={<LeaderboardIcon />} label="Rankings" to="#" />
          {isAdmin && <NavItem icon={<HistoryIcon />} label="Usuarios" to="/historial-usuarios" />}
        </div>

        <NavItem icon={<SettingsIcon />} label="Configuración" to="/reset" />
      </nav>

      <main className="min-h-screen px-4 pb-16 pt-24 md:pl-72 md:pr-8">
        <div className="mx-auto max-w-7xl">
          <header className="mb-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-blue-600">
                  <DateIcon /> Retos diarios</span>
                <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900">Retos diarios de programación</h1>
                <p className="mt-3 max-w-2xl text-sm text-slate-600">
                  Descubre desafíos nuevos cada día y mejora tus habilidades con problemas reales de algoritmo, estructura de datos y lógica.
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
                    {formMode === 'create' ? 'Cerrar formulario' : 'Crear reto'}
                  </button>
                ) : null}
                <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-500 shadow-sm">
                  <p className="font-semibold text-slate-900">{greeting}, {firstName}</p>
                  <p className="mt-1">Consulta los retos activos y prepara tu próxima solución.</p>
                </div>
              </div>
            </div>
          </header>

          {isAdmin ? (
            <div className="mb-6 rounded-2xl border border-amber-100 bg-amber-50 p-5 text-sm text-amber-900 shadow-sm">
              <p className="font-semibold">Acceso de administrador habilitado</p>
              <p className="mt-2 text-slate-700">Tienes permiso para crear, editar y eliminar retos diarios. Estas acciones solo están visibles para cuentas con rol admin.</p>
            </div>
          ) : (
            <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-700 shadow-sm">
              <p className="font-semibold">Acceso de lectura</p>
              <p className="mt-2">Estás viendo los retos diarios publicados. Si tu cuenta es admin, podrás gestionar la colección completa desde este panel.</p>
            </div>
          )}

          {isAdmin && formMode ? (
            <ChallengeForm
              mode={formMode}
              challenge={selectedChallenge}
              isSubmitting={isSavingChallenge}
              onCancel={() => { setFormMode(null); setSelectedChallenge(null); setDeleteError(''); }}
              onSubmit={handleSaveChallenge}
            />
          ) : null}

          <div className="grid gap-6 md:grid-cols-3">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-600">Retos totales</p>
              <p className="mt-3 text-3xl font-bold text-slate-900">{totalChallenges}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-600">Activos</p>
              <p className="mt-3 text-3xl font-bold text-slate-900">{activeChallenges}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-600">Borradores / Archivados</p>
              <p className="mt-3 text-3xl font-bold text-slate-900">{draftChallenges + archivedChallenges}</p>
            </div>
          </div>

          <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Retos disponibles</h2>
                <p className="mt-2 text-sm text-slate-600">Visualiza los retos que puedes resolver hoy. Los admins ven además borradores y retos archivados.</p>
              </div>
              <div className="text-sm text-slate-500">
                {loading ? 'Cargando retos...' : `${totalChallenges} retos encontrados`}
              </div>
            </div>

            {error ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                {error}
              </div>
            ) : null}

            {deleteError ? (
              <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                {deleteError}
              </div>
            ) : null}

            {loading ? (
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-10 text-center text-slate-500">Cargando retos...</div>
            ) : null}

            {!loading && challenges.length === 0 ? (
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-10 text-center text-slate-500">No hay retos disponibles por el momento.</div>
            ) : null}

            <div className="grid gap-4 pt-2 sm:grid-cols-2 xl:grid-cols-3">
              {challenges.map((challenge) => (
                <article key={challenge.id} className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusStyles[challenge.status] || statusStyles.active}`}>
                      {statusLabels[challenge.status] || challenge.status}
                    </span>
                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-500">
                      {difficultyOptions.find((item) => item.value === challenge.difficulty)?.label || 'N/A'}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">{challenge.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{challenge.description || 'Sin descripción.'}</p>
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    {Array.isArray(challenge.tags) ? challenge.tags.map((tag) => (
                      <span key={tag} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{tag}</span>
                    )) : null}
                  </div>
                  <div className="mt-6 flex flex-wrap gap-2">
                    {isAdmin ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleEditChallenge(challenge)}
                          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                        >
                          <EditIcon />Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteChallenge(challenge)}
                          disabled={isDeletingChallenge}
                          className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <DeleteIcon />Eliminar
                        </button>
                      </>
                    ) : (
                      <span className="rounded-full bg-white px-3 py-2 text-xs font-semibold text-slate-600">Solo lectura</span>
                    )}
                  </div>
                  <div className="mt-5 text-xs uppercase tracking-[0.24em] text-slate-400">
                    Publicado: {formatDate(challenge.publishedAt)}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DailyChallengesPage;
