import {
  addDoc, collection, deleteDoc, doc,
  getDoc, getDocs, orderBy, query, serverTimestamp, updateDoc, where,
} from 'firebase/firestore';
import { db, hasFirebaseConfig } from './firebaseConfig';

const GRUPOS_COLLECTION = 'grupos';

const getCodigos = (miembros) =>
  (miembros ?? []).map(m => m.codigo).filter(Boolean);

const syncTournamentCount = async (torneoId) => {
  if (!torneoId) return;
  const snap = await getDocs(
    query(collection(db, GRUPOS_COLLECTION), where('torneoId', '==', torneoId))
  );
  const allCodigos = snap.docs.flatMap(d => getCodigos(d.data().miembros));
  await updateDoc(doc(db, 'tournaments', torneoId), {
    registeredTeams: allCodigos,
  });
};

export const getGrupos = async () => {
  if (!hasFirebaseConfig || !db) return [];
  try {
    const snap = await getDocs(query(collection(db, GRUPOS_COLLECTION), orderBy('createdAt', 'desc')));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch {
    return [];
  }
};

export const createGrupo = async (data) => {
  if (!hasFirebaseConfig || !db) throw new Error('Firebase no disponible.');
  const docRef = await addDoc(collection(db, GRUPOS_COLLECTION), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  await syncTournamentCount(data.torneoId);
  return docRef;
};

export const updateGrupo = async (id, data) => {
  if (!hasFirebaseConfig || !db) throw new Error('Firebase no disponible.');
  const grupoRef = doc(db, GRUPOS_COLLECTION, id);
  const oldSnap = await getDoc(grupoRef);
  const oldTorneoId = oldSnap.exists() ? oldSnap.data().torneoId : null;

  await updateDoc(grupoRef, { ...data, updatedAt: serverTimestamp() });

  await syncTournamentCount(data.torneoId);
  if (oldTorneoId && oldTorneoId !== data.torneoId) {
    await syncTournamentCount(oldTorneoId);
  }
};

export const deleteGrupo = async (id) => {
  if (!hasFirebaseConfig || !db) throw new Error('Firebase no disponible.');
  const grupoRef = doc(db, GRUPOS_COLLECTION, id);
  const snap = await getDoc(grupoRef);
  const torneoId = snap.exists() ? snap.data().torneoId : null;

  await deleteDoc(grupoRef);
  await syncTournamentCount(torneoId);
};
