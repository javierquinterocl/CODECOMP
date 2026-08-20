import { useCallback, useEffect, useRef, useState } from 'react';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { useAuth } from './context/AuthContext';
import { createGrupo, deleteGrupo, getGrupos, updateGrupo } from './gruposService';

const ROLES = [
  { value: 'programador',  label: 'Programador',          color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { value: 'matematico',   label: 'Matemático',            color: 'bg-violet-100 text-violet-700 border-violet-200' },
  { value: 'comprension',  label: 'Inglés y Comprensión',  color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
];

const roleLabel  = v => ROLES.find(r => r.value === v)?.label  ?? v;
const roleColor  = v => ROLES.find(r => r.value === v)?.color  ?? '';

const EMPTY_FORM = () => ({
  nombre: '',
  torneoId: '',
  miembros: ROLES.map(r => ({ rol: r.value, usuario: null, busqueda: '' })),
});

const TournamentIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M7 4h10v3a5 5 0 01-3 4.58V13a2 2 0 002 2h1a3 3 0 013 3v2H4v-2a3 3 0 013-3h1a2 2 0 002-2v-1.42A5 5 0 017 7V4z" />
  </svg>
);

const GruposIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
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

const SearchIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
  </svg>
);

const XIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const MemberAvatar = ({ miembro, size = 'sm' }) => {
  const [imgErr, setImgErr] = useState(false);
  const initial = `${miembro.nombre?.[0] ?? '?'}`.toUpperCase();
  const sz = size === 'lg' ? 'h-10 w-10 text-base' : 'h-8 w-8 text-sm';
  const fallback = <div className={`${sz} flex items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-blue-400 font-bold text-white`}>{initial}</div>;
  if (miembro.photoURL && !imgErr) {
    return <img alt={miembro.nombre} className={`${sz} rounded-full object-cover`} src={miembro.photoURL} onError={() => setImgErr(true)} />;
  }
  return fallback;
};

const GruposPage = () => {
  const { user, isAdmin, displayName } = useAuth();
  const firstName = displayName.split(' ')[0];

  const [grupos, setGrupos]                 = useState([]);
  const [torneos, setTorneos]               = useState([]);
  const [todosUsuarios, setTodosUsuarios]   = useState([]);
  const [loading, setLoading]               = useState(true);

  const [showForm, setShowForm]             = useState(false);
  const [editingId, setEditingId]           = useState(null);
  const [saving, setSaving]                 = useState(false);
  const [formError, setFormError]           = useState('');
  const [openSlotIdx, setOpenSlotIdx]       = useState(null);
  const [deleteModal, setDeleteModal]       = useState({ open: false, grupo: null, deleting: false });
  const [searchFilter, setSearchFilter]     = useState('');

  const [form, setForm] = useState(EMPTY_FORM());

  const searchRefs = useRef([]);

  const loadData = useCallback(async () => {
    setLoading(true);

    try {
      const g = await getGrupos();
      setGrupos(g);
    } catch (e) { console.error('[grupos]', e.code, e.message); }

    try {
      const t = await getDocs(query(collection(db, 'tournaments'), orderBy('createdAt', 'desc')));
      setTorneos(t.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { console.error('[tournaments]', e.code, e.message); }

    try {
      const u = await getDocs(collection(db, 'usuarios_registrados'));
      setTodosUsuarios(u.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { console.error('[usuarios]', e.code, e.message); }

    setLoading(false);
  }, []);

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user, loadData]);

  const openCreate = () => {
    setForm(EMPTY_FORM());
    setEditingId(null);
    setFormError('');
    setOpenSlotIdx(null);
    setShowForm(true);
  };

  const openEdit = (grupo) => {
    setForm({
      nombre: grupo.nombre,
      torneoId: grupo.torneoId,
      miembros: ROLES.map(r => {
        const m = grupo.miembros?.find(x => x.rol === r.value);
        return { rol: r.value, usuario: m ?? null, busqueda: '' };
      }),
    });
    setEditingId(grupo.id);
    setFormError('');
    setOpenSlotIdx(null);
    setShowForm(true);
  };

  const closeForm = () => { setShowForm(false); setEditingId(null); setFormError(''); };

  const getResultados = (busqueda, slotIdx) => {
    const lower = busqueda.toLowerCase().trim();
    const usedCodigos = form.miembros
      .filter((m, i) => i !== slotIdx && m.usuario)
      .map(m => m.usuario.codigo);
    return todosUsuarios
      .filter(u => {
        const full = `${u.nombre ?? ''} ${u.apellido ?? ''}`.toLowerCase();
        const cod  = (u.codigo ?? '').toLowerCase();
        const match = !lower || full.includes(lower) || cod.includes(lower);
        return match && !usedCodigos.includes(u.codigo);
      })
      .slice(0, 8);
  };

  const updateBusqueda = (slotIdx, val) => {
    setForm(prev => ({
      ...prev,
      miembros: prev.miembros.map((m, i) => i === slotIdx ? { ...m, busqueda: val } : m),
    }));
    setOpenSlotIdx(slotIdx);
  };

  const selectUsuario = (usuario, slotIdx) => {
    const dup = form.miembros.some((m, i) => i !== slotIdx && m.usuario?.codigo === usuario.codigo);
    if (dup) { setFormError('Este estudiante ya está en el grupo (mismo código de estudiante).'); return; }
    setFormError('');
    setForm(prev => ({
      ...prev,
      miembros: prev.miembros.map((m, i) => i === slotIdx ? { ...m, usuario, busqueda: '' } : m),
    }));
    setOpenSlotIdx(null);
  };

  const clearUsuario = (slotIdx) => {
    setForm(prev => ({
      ...prev,
      miembros: prev.miembros.map((m, i) => i === slotIdx ? { ...m, usuario: null, busqueda: '' } : m),
    }));
  };

  const validate = () => {
    if (!form.nombre.trim() || form.nombre.trim().length < 3)
      return 'El nombre del grupo debe tener al menos 3 caracteres.';
    if (!form.torneoId)
      return 'Selecciona un torneo para el grupo.';

    const torneo = torneos.find(t => t.id === form.torneoId);
    if (torneo?.status === 'cancelled') return 'No puedes crear un grupo en un torneo cancelado.';
    if (torneo?.status === 'completed') return 'No puedes crear un grupo en un torneo ya finalizado.';
    if (torneo?.registrationDeadline) {
      const deadline = torneo.registrationDeadline.toDate
        ? torneo.registrationDeadline.toDate()
        : new Date(torneo.registrationDeadline);
      if (deadline < new Date()) return 'El período de inscripción de este torneo ya cerró.';
    }

    if (form.miembros.some(m => !m.usuario))
      return 'Debes seleccionar los 3 integrantes del grupo.';
    const codigos = form.miembros.map(m => m.usuario.codigo);
    if (new Set(codigos).size !== 3)
      return 'No puede haber integrantes duplicados (mismo código de estudiante).';
    return null;
  };

  const handleSave = async () => {
    const err = validate();
    if (err) { setFormError(err); return; }

    const codigosNuevos = form.miembros.map(m => m.usuario.codigo);
    const gruposDelTorneo = grupos.filter(g => g.torneoId === form.torneoId && g.id !== editingId);

    const torneo = torneos.find(t => t.id === form.torneoId);
    if (torneo?.maxTeams && gruposDelTorneo.length >= Number(torneo.maxTeams)) {
      setFormError(`El torneo "${torneo.title}" ya alcanzó su capacidad máxima de ${torneo.maxTeams} grupos.`);
      return;
    }

    const nombreNuevo = form.nombre.trim().toLowerCase();
    const nombreDup = gruposDelTorneo.find(g => g.nombre?.trim().toLowerCase() === nombreNuevo);
    if (nombreDup) {
      setFormError(`Ya existe un grupo llamado "${form.nombre.trim()}" en este torneo.`);
      return;
    }

    for (const g of gruposDelTorneo) {
      const codigosExistentes = (g.miembros ?? []).map(m => m.codigo);
      const dup = codigosNuevos.find(c => codigosExistentes.includes(c));
      if (dup) {
        const miembro = (g.miembros ?? []).find(m => m.codigo === dup);
        setFormError(`${miembro?.nombre ?? 'Un integrante'} ${miembro?.apellido ?? ''} (${dup}) ya pertenece al grupo "${g.nombre}" en este torneo.`);
        return;
      }
    }

    setSaving(true);
    setFormError('');
    try {
      const torneoEncontrado = torneos.find(t => t.id === form.torneoId);
      const payload = {
        nombre: form.nombre.trim(),
        torneoId: form.torneoId,
        torneoNombre: torneoEncontrado?.title ?? '',
        miembros: form.miembros.map(m => ({
          uid:      m.usuario.uid ?? m.usuario.id,
          codigo:   m.usuario.codigo,
          nombre:   m.usuario.nombre,
          apellido: m.usuario.apellido,
          email:    m.usuario.email,
          photoURL: m.usuario.photoURL ?? null,
          rol:      m.rol,
        })),
      };
      if (editingId) await updateGrupo(editingId, payload);
      else           await createGrupo(payload);
      closeForm();
      await loadData();
    } catch {
      setFormError('Error al guardar el grupo. Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteModal.grupo) return;
    setDeleteModal(d => ({ ...d, deleting: true }));
    try {
      await deleteGrupo(deleteModal.grupo.id);
      setDeleteModal({ open: false, grupo: null, deleting: false });
      await loadData();
    } catch {
      setDeleteModal(d => ({ ...d, deleting: false }));
    }
  };

  const gruposFiltrados = grupos.filter(g => {
    const q = searchFilter.toLowerCase();
    if (!q) return true;
    const inNombre  = g.nombre?.toLowerCase().includes(q);
    const inTorneo  = g.torneoNombre?.toLowerCase().includes(q);
    const inMiembro = g.miembros?.some(m =>
      `${m.nombre} ${m.apellido}`.toLowerCase().includes(q) || m.codigo?.includes(searchFilter)
    );
    return inNombre || inTorneo || inMiembro;
  });

  return (
    <div className="mx-auto max-w-6xl">

      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-['Space_Grotesk'] text-3xl font-bold tracking-tight text-slate-900">Grupos</h1>
          <p className="mt-1 font-['Inter'] text-base text-slate-500">
            {grupos.length} grupo{grupos.length !== 1 ? 's' : ''} registrado{grupos.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><SearchIcon /></span>
            <input
              type="text"
              placeholder="Buscar grupos..."
              value={searchFilter}
              onChange={e => setSearchFilter(e.target.value)}
              className="w-56 rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-4 font-['Inter'] text-sm text-slate-700 shadow-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          </div>
          {isAdmin && (
            <button
              onClick={openCreate}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-700 to-blue-500 px-5 py-2.5 font-['Space_Grotesk'] text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:brightness-110"
            >
              <PlusIcon />Nuevo grupo
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-32">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
        </div>
      ) : gruposFiltrados.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white py-24 text-center shadow-sm">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50">
            <GruposIcon />
          </div>
          <p className="font-['Space_Grotesk'] text-lg font-bold text-slate-900">
            {searchFilter ? 'Sin resultados' : 'No hay grupos aún'}
          </p>
          <p className="mt-1 font-['Inter'] text-sm text-slate-400">
            {searchFilter ? 'Prueba con otro término de búsqueda.' : 'Crea el primer grupo para empezar.'}
          </p>
          {!searchFilter && isAdmin && (
            <button
              onClick={openCreate}
              className="mt-6 flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-700 to-blue-500 px-5 py-2.5 font-['Space_Grotesk'] text-sm font-bold text-white transition hover:brightness-110"
            >
              <PlusIcon />Crear grupo
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-3">
          {gruposFiltrados.map(grupo => (
            <div
              key={grupo.id}
              className="flex flex-col rounded-2xl border border-slate-200 bg-white shadow-[0_4px_20px_rgba(15,23,42,0.06)] transition-all duration-200 hover:shadow-[0_8px_32px_rgba(0,82,255,0.08)]"
            >
              {/* Card header */}
              <div className="border-b border-slate-100 px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-['Space_Grotesk'] text-lg font-bold text-slate-900 leading-tight">{grupo.nombre}</h3>
                </div>
                {grupo.torneoNombre && (
                  <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 border border-blue-100">
                    <TournamentIcon />
                    <span className="font-['Space_Grotesk'] text-[11px]">{grupo.torneoNombre}</span>
                  </div>
                )}
              </div>

              {/* Members */}
              <div className="flex flex-col gap-2 px-5 py-4 flex-1">
                {(grupo.miembros ?? []).map((m, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <MemberAvatar miembro={m} />
                    <div className="flex-1 min-w-0">
                      <p className="font-['Space_Grotesk'] text-sm font-semibold text-slate-900 truncate">
                        {m.nombre} {m.apellido}
                      </p>
                      <p className="font-mono text-[11px] text-slate-400">{m.codigo}</p>
                    </div>
                    <span className={`shrink-0 rounded-full border px-2 py-0.5 font-['Space_Grotesk'] text-[10px] font-bold uppercase tracking-wide ${roleColor(m.rol)}`}>
                      {roleLabel(m.rol)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Card footer */}
              <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-5 py-3">
                {isAdmin ? (
                  <>
                    <button
                      onClick={() => openEdit(grupo)}
                      className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 font-['Space_Grotesk'] text-xs font-semibold text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                    >
                      <EditIcon />Editar
                    </button>
                    <button
                      onClick={() => setDeleteModal({ open: true, grupo, deleting: false })}
                      className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 font-['Space_Grotesk'] text-xs font-semibold text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                    >
                      <DeleteIcon />Eliminar
                    </button>
                  </>
                ) : (
                  <span className="rounded-full bg-slate-50 px-3 py-1.5 font-['Space_Grotesk'] text-xs font-semibold text-slate-400">Solo lectura</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── FORM MODAL ─────────────────────────────────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-[0_32px_80px_rgba(15,23,42,0.18)] max-h-[90vh] flex flex-col">

            {/* Modal header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
              <h2 className="font-['Space_Grotesk'] text-xl font-bold text-slate-900">
                {editingId ? 'Editar grupo' : 'Nuevo grupo'}
              </h2>
              <button onClick={closeForm} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600">
                <XIcon />
              </button>
            </div>

            {/* Modal body */}
            <div className="overflow-y-auto px-6 py-5 flex-1">
              <div className="space-y-5">

                {/* Nombre */}
                <div className="space-y-1.5">
                  <label className="block font-['Space_Grotesk'] text-xs font-bold uppercase tracking-wider text-slate-600">
                    Nombre del grupo
                  </label>
                  <input
                    type="text"
                    maxLength={60}
                    placeholder="Ej: Equipo Alpha"
                    value={form.nombre}
                    onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 font-['Inter'] text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                {/* Torneo */}
                <div className="space-y-1.5">
                  <label className="block font-['Space_Grotesk'] text-xs font-bold uppercase tracking-wider text-slate-600">
                    Torneo
                  </label>
                  <select
                    value={form.torneoId}
                    onChange={e => setForm(f => ({ ...f, torneoId: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 font-['Inter'] text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="">Selecciona un torneo...</option>
                    {torneos
                      .filter(t => t.status === 'active' || t.status === 'draft')
                      .map(t => (
                        <option key={t.id} value={t.id}>{t.title}</option>
                      ))}
                  </select>
                </div>

                {/* Member slots */}
                <div className="space-y-3">
                  <label className="block font-['Space_Grotesk'] text-xs font-bold uppercase tracking-wider text-slate-600">
                    Integrantes del grupo
                  </label>
                  {form.miembros.map((slot, idx) => {
                    const role   = ROLES[idx];
                    const results = getResultados(slot.busqueda, idx);
                    return (
                      <div key={role.value} className="rounded-xl border border-slate-300 bg-white p-4">
                        <div className="mb-3 flex items-center gap-2">
                          <span className="rounded-full border border-slate-300 bg-white px-2.5 py-0.5 font-['Space_Grotesk'] text-[11px] font-bold uppercase tracking-wide text-slate-600">
                            {role.label}
                          </span>
                        </div>

                        {slot.usuario ? (
                          <div className="flex items-center gap-3">
                            <MemberAvatar miembro={slot.usuario} size="lg" />
                            <div className="flex-1 min-w-0">
                              <p className="font-['Space_Grotesk'] text-sm font-bold text-slate-900">
                                {slot.usuario.nombre} {slot.usuario.apellido}
                              </p>
                              <p className="font-mono text-[11px] text-slate-400">{slot.usuario.codigo} · {slot.usuario.email}</p>
                            </div>
                            <button
                              onClick={() => clearUsuario(idx)}
                              className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition hover:border-red-200 hover:bg-red-50 hover:text-red-500"
                            >
                              <XIcon />
                            </button>
                          </div>
                        ) : (
                          <div className="relative" ref={el => (searchRefs.current[idx] = el)}>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><SearchIcon /></span>
                              <input
                                type="text"
                                placeholder="Buscar por nombre o código..."
                                value={slot.busqueda}
                                onChange={e => updateBusqueda(idx, e.target.value)}
                                onFocus={() => setOpenSlotIdx(idx)}
                                onBlur={() => setTimeout(() => setOpenSlotIdx(null), 160)}
                                className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-4 font-['Inter'] text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                              />
                            </div>
                            {openSlotIdx === idx && results.length > 0 && (
                              <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl">
                                {results.map(u => (
                                  <button
                                    key={u.id}
                                    onMouseDown={() => selectUsuario(u, idx)}
                                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-blue-50"
                                  >
                                    <MemberAvatar miembro={u} />
                                    <div className="flex-1 min-w-0">
                                      <p className="font-['Space_Grotesk'] text-sm font-semibold text-slate-900 truncate">
                                        {u.nombre} {u.apellido}
                                      </p>
                                      <p className="font-mono text-[11px] text-slate-400">{u.codigo} · {u.email}</p>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            )}
                            {openSlotIdx === idx && slot.busqueda.trim() && results.length === 0 && (
                              <div className="absolute left-0 right-0 top-full z-20 mt-1 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-xl">
                                <p className="font-['Inter'] text-sm text-slate-400">Sin resultados para "{slot.busqueda}"</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Error */}
                {formError && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 font-['Inter'] text-sm text-red-700">
                    {formError}
                  </div>
                )}
              </div>
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4">
              <button
                onClick={closeForm}
                className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-2.5 font-['Space_Grotesk'] text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-700 to-blue-500 px-5 py-2.5 font-['Space_Grotesk'] text-sm font-bold text-white shadow-sm transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? (
                  <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />Guardando...</>
                ) : (
                  <>{editingId ? 'Guardar cambios' : 'Crear grupo'}</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── DELETE MODAL ───────────────────────────────────────────────────── */}
      {deleteModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_32px_80px_rgba(15,23,42,0.18)]">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-500">
              <DeleteIcon />
            </div>
            <h3 className="font-['Space_Grotesk'] text-lg font-bold text-slate-900">¿Eliminar grupo?</h3>
            <p className="mt-2 font-['Inter'] text-sm text-slate-500">
              El grupo <strong className="text-slate-800">{deleteModal.grupo?.nombre}</strong> será eliminado permanentemente. Esta acción no se puede deshacer.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setDeleteModal({ open: false, grupo: null, deleting: false })}
                className="flex-1 rounded-xl border border-slate-200 bg-slate-50 py-2.5 font-['Space_Grotesk'] text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteModal.deleting}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-500 py-2.5 font-['Space_Grotesk'] text-sm font-bold text-white transition hover:bg-red-600 disabled:opacity-60"
              >
                {deleteModal.deleting
                  ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />Eliminando...</>
                  : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default GruposPage;
