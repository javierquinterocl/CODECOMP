import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { onAuthStateChanged, signOut, updateProfile } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../scripts/firebaseConfig';
import { ADMIN_EMAILS } from '../scripts/config';
import { actualizarCodigoPerfil, actualizarNombrePerfil, getUserSessions, updateSessionExit } from '../scripts/registerService';
import { cerrarSesionCookie } from '../scripts/registroApi';
import { API_BASE } from '../scripts/apiBase';
import { olvidarFotos, urlDeFoto } from '../scripts/cuentaApi';

// Códigos con los que la API pide cerrar la sesión en este navegador.
const CIERRE_DEL_SERVIDOR = new Set(['sesion-cerrada', 'cuenta-eliminada']);

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
  // Foto subida a CODECOMP (blob URL); tiene prioridad sobre la de Google.
  const [fotoPropia, setFotoPropia] = useState(null);
  // Sube al cambiar el nombre: el objeto de Firebase cambia por dentro y React no lo nota.
  const [, setNombreVersion] = useState(0);
  const cerrando = useRef(false);

  // Si la API dice que la sesión se cerró en todos los dispositivos o la cuenta se borró,
  // se cierra también aquí, una sola vez aunque lleguen varias respuestas a la vez.
  useEffect(() => {
    const original = window.fetch;
    window.fetch = async (...args) => {
      const respuesta = await original(...args);
      const url = String(args[0]?.url ?? args[0]);
      if ((respuesta.status === 401 || respuesta.status === 403) && url.startsWith(API_BASE)) {
        respuesta.clone().json().then(async (data) => {
          if (!CIERRE_DEL_SERVIDOR.has(data?.codigo) || cerrando.current) return;
          cerrando.current = true;
          cerrarSesionCookie();
          olvidarFotos();
          await signOut(auth).catch(() => {});
          navigate('/', { state: { openLogin: true } });
        }).catch(() => {});
      }
      return respuesta;
    };
    return () => { window.fetch = original; };
  }, [navigate]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        cerrando.current = false;
        setUser(currentUser);
        urlDeFoto(currentUser, 'yo', Date.now()).then(setFotoPropia);
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
        setFotoPropia(null);
        olvidarFotos();
      }
      setAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      if (user) {
        const sessions = await getUserSessions(user.uid);
        const activeSessions = sessions.filter((s) => s.status === 'activo');
        await Promise.all(activeSessions.map((s) => updateSessionExit(s.id, Date.now())));
      }
      cerrarSesionCookie();
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error('Error al finalizar sesión:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  // Guarda el código nuevo en el perfil y lo refleja en la cabecera sin recargar.
  const actualizarCodigoEstudiante = async (codigo) => {
    if (!user) return;
    await actualizarCodigoPerfil(user.uid, codigo);
    setCodigoEstudiante(codigo.trim());
  };

  // Tras subir o quitar la foto en Mi cuenta: la cabecera se actualiza sin recargar.
  const refrescarFoto = async (version) => {
    olvidarFotos();
    setFotoPropia(version && user ? await urlDeFoto(user, 'yo', version) : null);
  };

  // Nombre visible en la cabecera (Firebase) y en el perfil (Firestore).
  const actualizarNombre = async (nombre, apellido) => {
    if (!auth.currentUser) return;
    await updateProfile(auth.currentUser, { displayName: `${nombre} ${apellido}`.trim() });
    await actualizarNombrePerfil(auth.currentUser.uid, nombre, apellido);
    setNombreVersion((v) => v + 1);
  };

  const displayName = user?.displayName || user?.email?.split('@')[0] || 'Usuario';
  const firstName = displayName.trim().split(/\s+/)[0];

  const value = {
    user,
    isAdmin,
    codigoEstudiante,
    actualizarCodigoEstudiante,
    storedPhotoURL,
    fotoPropia,
    refrescarFoto,
    actualizarNombre,
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
