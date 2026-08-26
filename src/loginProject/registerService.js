import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc, collection, getDocs, query, orderBy, where, updateDoc } from 'firebase/firestore';
import { auth, db, hasFirebaseConfig } from '../firebase/firebaseConfig';

const USERS_COLLECTION = 'usuarios_registrados';

const normalizeString = (value = '') => value.trim();

export const registerUserInFirestore = async (formData) => {
  if (!hasFirebaseConfig || !db || !auth) {
    throw new Error('La configuracion del proyecto no es valida.');
  }

  const email = normalizeString(formData.email).toLowerCase();
  const password = formData.password;

  let firebaseUser;

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    firebaseUser = userCredential.user;
  } catch (error) {
    if (error?.code === 'auth/email-already-in-use') {
      throw new Error('El correo electronico ya esta registrado.');
    }

    if (error?.code === 'auth/invalid-email') {
      throw new Error('El correo electronico no tiene un formato valido.');
    }

    if (error?.code === 'auth/weak-password' || error?.code === 'auth/password-does-not-meet-requirements') {
      throw new Error('La contraseña no cumple los requisitos: mínimo 10 caracteres, mayúscula, minúscula, número y carácter especial.');
    }

    throw new Error('No se pudo crear la cuenta.');
  }

  const payload = {
    uid: firebaseUser.uid,
    nombre: normalizeString(formData.nombre),
    apellido: normalizeString(formData.apellido),
    codigo: normalizeString(formData.codigo),
    email,
    createdAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, USERS_COLLECTION, firebaseUser.uid), payload);
  } catch (error) {
    if (error?.code === 'permission-denied') {
      throw new Error('No tienes permisos para completar el registro.');
    }

    throw new Error('No se pudo guardar la informacion del usuario.');
  }

  return {
    id: firebaseUser.uid,
    ...payload,
  };
};

export const googleUserExistsInFirestore = async (uid) => {
  if (!hasFirebaseConfig || !db) return false;
  const snap = await getDoc(doc(db, USERS_COLLECTION, uid));
  return snap.exists();
};

export const updateUserPhotoURL = async (uid, photoURL) => {
  if (!hasFirebaseConfig || !db || !photoURL) return;
  try {
    const userRef = doc(db, USERS_COLLECTION, uid);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      await updateDoc(userRef, { photoURL });
    }
  } catch (error) {
    console.error('Error al actualizar photoURL:', error.message);
  }
};

export const saveGoogleUserToFirestore = async ({ uid, email, nombre, apellido, codigo, photoURL = null }) => {
  if (!hasFirebaseConfig || !db) {
    throw new Error('La configuracion del proyecto no es valida.');
  }

  const payload = {
    uid,
    nombre: normalizeString(nombre),
    apellido: normalizeString(apellido),
    codigo: normalizeString(codigo),
    email,
    photoURL: photoURL || null,
    createdAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, USERS_COLLECTION, uid), payload);
  } catch (error) {
    if (error?.code === 'permission-denied') {
      throw new Error('No tienes permisos para completar el registro.');
    }
    throw new Error('No se pudo guardar la informacion del usuario.');
  }

  return { id: uid, ...payload };
};

// Funciones para el historial de sesiones
const SESSIONS_COLLECTION = 'historial_sesiones';

export const getSessionsHistory = async () => {
  if (!hasFirebaseConfig || !db) {
    return [];
  }

  try {
    const sessionsRef = collection(db, SESSIONS_COLLECTION);
    
    // Intentar primero con ordenamiento
    try {
      const q = query(sessionsRef, orderBy('entryTime', 'desc'));
      const snap = await getDocs(q);

      const sessions = [];
      snap.forEach((doc) => {
        sessions.push({ id: doc.id, ...doc.data() });
      });
      return sessions;
    } catch (orderError) {
      // Si falla el ordenamiento, intenta sin ordenar
      const snap = await getDocs(sessionsRef);

      const sessions = [];
      snap.forEach((doc) => {
        sessions.push({ id: doc.id, ...doc.data() });
      });
      
      // Ordenar localmente si hay datos
      return sessions.sort((a, b) => (b.entryTime || 0) - (a.entryTime || 0));
    }
  } catch (error) {
    console.error('Error al obtener sesiones:', error.message);
    return [];
  }
};

/**
 * Sesiones de un solo usuario. getSessionsHistory() trae las de todos y
 * queda reservada al panel de administración: usar esta en los flujos
 * normales evita exponer el historial ajeno.
 */
export const getUserSessions = async (uid) => {
  if (!hasFirebaseConfig || !db || !uid) return [];

  try {
    const snap = await getDocs(query(collection(db, SESSIONS_COLLECTION), where('uid', '==', uid)));
    const sessions = [];
    snap.forEach((d) => sessions.push({ id: d.id, ...d.data() }));
    return sessions.sort((a, b) => (b.entryTime || 0) - (a.entryTime || 0));
  } catch (error) {
    console.error('Error al obtener sesiones del usuario:', error.message);
    return [];
  }
};

export const updateSessionExit = async (sessionId, exitTime) => {
  if (!hasFirebaseConfig || !db) {
    throw new Error('La configuracion del proyecto no es valida.');
  }

  try {
    const sessionRef = doc(db, SESSIONS_COLLECTION, sessionId);
    const snap = await getDoc(sessionRef);
    const entryTime = snap.exists() ? (snap.data().entryTime ?? null) : null;
    const duration = entryTime !== null ? exitTime - entryTime : null;

    await updateDoc(sessionRef, {
      exitTime,
      status: 'finalizado',
      duration,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    throw new Error('No se pudo actualizar la sesión.');
  }
};

export const updateActiveSessionsCodigo = async (uid, codigo) => {
  if (!hasFirebaseConfig || !db) return;
  try {
    const sessions = await getUserSessions(uid);
    const active = sessions.filter((s) => s.status === 'activo');
    await Promise.all(
      active.map((s) => updateDoc(doc(db, SESSIONS_COLLECTION, s.id), { codigo }))
    );
  } catch (error) {
    console.error('Error al actualizar codigo en sesiones activas:', error.message);
  }
};

export const finalizeLatestActiveSession = async (uid, exitTime) => {
  if (!hasFirebaseConfig || !db) {
    throw new Error('La configuracion del proyecto no es valida.');
  }

  try {
    const sessions = await getUserSessions(uid);
    const activeSession = sessions.find((session) => session.status === 'activo');

    if (activeSession) {
      await updateSessionExit(activeSession.id, exitTime);
    }
  } catch (error) {
    console.error('Error al finalizar sesión activa:', error.message);
    throw error;
  }
};

export const createSessionRecord = async (uid, method, authUser = null) => {
  if (!hasFirebaseConfig || !db) {
    throw new Error('La configuracion del proyecto no es valida.');
  }

  try {
    const userSnap = await getDoc(doc(db, USERS_COLLECTION, uid));

    let userData;
    if (userSnap.exists()) {
      userData = userSnap.data();
    } else {
      // Usuario nuevo por OAuth: usar datos de Firebase Auth como fallback
      const displayName = authUser?.displayName?.trim() || '';
      const parts = displayName.split(' ');
      userData = {
        nombre: parts[0] || 'Usuario',
        apellido: parts.slice(1).join(' ') || '',
        email: authUser?.email || uid,
        codigo: '',
      };
    }

    const sessionData = {
      uid,
      nombre: userData.nombre || 'Usuario',
      apellido: userData.apellido || 'Nuevo',
      email: userData.email || uid,
      codigo: userData.codigo || '',
      method: method.toLowerCase(),
      entryTime: Date.now(),
      exitTime: null,
      status: 'activo',
      createdAt: serverTimestamp(),
    };

    // Crear documento de sesión con ID único
    const sessionId = `${uid}_${Date.now()}`;
    await setDoc(doc(db, SESSIONS_COLLECTION, sessionId), sessionData);

    return { id: sessionId, ...sessionData };
  } catch (error) {
    console.error('Error al crear registro de sesión:', error.message);
    throw error;
  }
};
