import { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../firebase/firebaseConfig';
import { ADMIN_EMAILS } from '../../config';
import { getSessionsHistory, updateSessionExit } from '../registerService';

const AuthContext = createContext(null);

const normalizeEmail = (value = '') => value.trim().toLowerCase();

export const AuthProvider = ({ children }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [codigoEstudiante, setCodigoEstudiante] = useState('');
  const [storedPhotoURL, setStoredPhotoURL] = useState(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        const currentEmail = normalizeEmail(currentUser.email);
        setIsAdmin(Boolean(currentEmail && ADMIN_EMAILS.some((email) => normalizeEmail(email) === currentEmail)));
        try {
          const snap = await getDoc(doc(db, 'usuarios_registrados', currentUser.uid));
          if (snap.exists()) {
            const data = snap.data();
            setCodigoEstudiante(data.codigo ?? '');
            setStoredPhotoURL(data.photoURL ?? null);
          }
        } catch (error) {
          console.error('Error leyendo perfil:', error);
        }
      } else {
        setUser(null);
        setIsAdmin(false);
        setCodigoEstudiante('');
        setStoredPhotoURL(null);
      }
      setAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      if (user) {
        const sessions = await getSessionsHistory();
        const activeSessions = sessions.filter((s) => s.uid === user.uid && s.status === 'activo');
        await Promise.all(activeSessions.map((s) => updateSessionExit(s.id, Date.now())));
      }
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error('Error al finalizar sesión:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const displayName = user?.displayName || user?.email?.split('@')[0] || 'Usuario';
  const firstName = displayName.split(' ')[0];

  const value = {
    user,
    isAdmin,
    codigoEstudiante,
    storedPhotoURL,
    displayName,
    firstName,
    isLoggingOut,
    handleLogout,
    authReady,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
