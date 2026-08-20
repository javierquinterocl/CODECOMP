import { useCallback, useEffect, useState } from 'react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db, hasFirebaseConfig } from '../firebase/firebaseConfig';
import { useAuth } from './context/AuthContext';

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
          <input name="title" value={formData.title} onChange={handleChange} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white" />
          {errors.title ? <p className="mt-2 text-xs text-rose-600">{errors.title}</p> : null}
        </div>

        <div>
          <label className="text-sm font-semibold text-slate-900">Dificultad</label>
          <select name="difficulty" value={formData.difficulty} onChange={handleChange} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white">
            {difficultyOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          {errors.difficulty ? <p className="mt-2 text-xs text-rose-600">{errors.difficulty}</p> : null}
        </div>

        <div className="lg:col-span-2">
          <label className="text-sm font-semibold text-slate-900">Descripción</label>
          <textarea name="description" value={formData.description} onChange={handleChange} rows={5} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white" />
          {errors.description ? <p className="mt-2 text-xs text-rose-600">{errors.description}</p> : null}
        </div>

        <div>
          <label className="text-sm font-semibold text-slate-900">Etiquetas (coma separadas)</label>
          <input name="tags" value={formData.tags} onChange={handleChange} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white" />
        </div>

        <div>
          <label className="text-sm font-semibold text-slate-900">Estado</label>
          <select name="status" value={formData.status} onChange={handleChange} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white">
            {challengeStatusOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          {errors.status ? <p className="mt-2 text-xs text-rose-600">{errors.status}</p> : null}
        </div>

        <div>
          <label className="text-sm font-semibold text-slate-900">Fecha de publicación</label>
          <input type="datetime-local" name="publishedAt" value={formData.publishedAt} onChange={handleChange} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white" />
          {errors.publishedAt ? <p className="mt-2 text-xs text-rose-600">{errors.publishedAt}</p> : null}
        </div>
      </div>
    </form>
  );
};

const DailyChallengesPage = () => {
  const { user, isAdmin, displayName } = useAuth();
  const firstName = displayName.split(' ')[0];

  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formMode, setFormMode] = useState(null);
  const [selectedChallenge, setSelectedChallenge] = useState(null);
  const [isSavingChallenge, setIsSavingChallenge] = useState(false);
  const [isDeletingChallenge, setIsDeletingChallenge] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches';

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
    if (!user) return;
    loadChallenges();
  }, [user, loadChallenges]);

  const handleCreateToggle = () => {
    setSelectedChallenge(null);
    setDeleteError('');
    setFormMode((currentValue) => (currentValue === 'create' ? null : 'create'));
  };

  const handleEditChallenge = (challenge) => {
    if (!isAdmin) return;
    setSelectedChallenge(challenge);
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
          createdBy: user?.email || '',
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

  return (
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
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>
        ) : null}

        {deleteError ? (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{deleteError}</div>
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
                    <button type="button" onClick={() => handleEditChallenge(challenge)} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100">
                      <EditIcon />Editar
                    </button>
                    <button type="button" onClick={() => handleDeleteChallenge(challenge)} disabled={isDeletingChallenge} className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60">
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
  );
};

export default DailyChallengesPage;
