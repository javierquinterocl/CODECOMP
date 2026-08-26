import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FacebookAuthProvider,
  fetchSignInMethodsForEmail,
  getAdditionalUserInfo,
  GithubAuthProvider,
  GoogleAuthProvider,
  linkWithCredential,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import { auth, googleProvider, githubProvider, facebookProvider, hasFirebaseConfig } from '../firebase/firebaseConfig';
import { googleUserExistsInFirestore, createSessionRecord, updateUserPhotoURL } from './registerService';

const PROVIDER_LABELS = {
  password: 'correo y contraseña',
  'google.com': 'Google',
  'github.com': 'GitHub',
  'facebook.com': 'Facebook',
};

export const getProviderLabel = (providerId) => PROVIDER_LABELS[providerId] || providerId;

/**
 * Traduce el fallo de un proveedor a algo accionable. Los tres primeros casos
 * son configuración de la consola de Firebase, no del código.
 */
const describeProviderError = (error, providerName) => {
  switch (error?.code) {
    case 'auth/operation-not-allowed':
      return `${providerName} no está habilitado en este proyecto de Firebase. Actívalo en Authentication → Sign-in method.`;
    case 'auth/unauthorized-domain':
      return `Este dominio no está autorizado en Firebase. Agrégalo en Authentication → Settings → Authorized domains.`;
    case 'auth/invalid-api-key':
    case 'auth/api-key-not-valid':
      return 'La API key de Firebase no es válida. Revisa el archivo .env.';
    case 'auth/popup-blocked':
      return 'El navegador bloqueó la ventana emergente. Permite las ventanas emergentes para este sitio.';
    case 'auth/network-request-failed':
      return 'Sin conexión. Revisa tu red e intenta de nuevo.';
    case 'auth/too-many-requests':
      return 'Demasiados intentos. Intenta más tarde.';
    default:
      return `No se pudo iniciar sesión con ${providerName}${error?.code ? ` (${error.code})` : ''}.`;
  }
};

const getPendingCredentialFromError = (error, providerClass) => {
  if (providerClass?.credentialFromError) return providerClass.credentialFromError(error);
  return error?.credential || null;
};

/**
 * Flujo de autenticación compartido por LoginPage y LoginModal.
 * Centraliza el cierre de sesión (registro de sesión + redirección) y el
 * inicio con proveedores externos, incluyendo la vinculación de cuentas
 * cuando el correo ya existe con otro proveedor.
 */
export const useSocialLogin = () => {
  const navigate = useNavigate();
  const [authError, setAuthError] = useState(null);
  const [isSocialLoading, setIsSocialLoading] = useState(false);
  const [pendingCredential, setPendingCredential] = useState(null);
  const [pendingEmail, setPendingEmail] = useState('');
  const [pendingMethods, setPendingMethods] = useState([]);
  const [pendingProvider, setPendingProvider] = useState('');

  const clearPendingLinkState = () => {
    setPendingCredential(null);
    setPendingEmail('');
    setPendingMethods([]);
    setPendingProvider('');
  };

  /** Registra la sesión, vincula credenciales pendientes y redirige. */
  const finishLogin = async (user, method, providerPhotoURL = null) => {
    const shouldLink = pendingCredential && pendingEmail && user?.email
      && user.email.toLowerCase() === pendingEmail.toLowerCase();

    if (pendingCredential && !shouldLink) clearPendingLinkState();

    if (shouldLink) {
      try {
        await linkWithCredential(user, pendingCredential);
        clearPendingLinkState();
      } catch (linkError) {
        console.error('Error al vincular credencial pendiente:', linkError?.code, linkError?.message);
        clearPendingLinkState();
        setAuthError(
          linkError?.code === 'auth/email-already-in-use'
            ? 'La cuenta ya tiene ese proveedor vinculado. Inicia sesión con el método original y prueba otra vez.'
            : 'Se inició sesión, pero no se pudo vincular la otra credencial.'
        );
      }
    }

    const resolvedPhoto = user.photoURL || providerPhotoURL || null;
    if (resolvedPhoto) await updateUserPhotoURL(user.uid, resolvedPhoto).catch(() => {});

    try {
      await createSessionRecord(user.uid, method, user);
    } catch (sessionError) {
      console.error('Error al registrar sesión:', sessionError.message);
    }

    const exists = await googleUserExistsInFirestore(user.uid);
    navigate(exists ? '/dashboard' : '/complete-profile', { state: { photoURL: resolvedPhoto } });
  };

  const promptAccountLinking = async (error, providerClass, providerName) => {
    const email = error?.customData?.email || error?.email;
    const pending = getPendingCredentialFromError(error, providerClass);
    if (!email || !pending) throw error;

    const methods = await fetchSignInMethodsForEmail(auth, email).catch(() => []);
    setPendingCredential(pending);
    setPendingEmail(email);
    setPendingMethods(methods);
    setPendingProvider(providerName);

    const methodsText = methods.length > 0
      ? methods.map(getProviderLabel).join(', ')
      : 'el método de autenticación original';

    setAuthError(`Este correo ya está registrado. Inicia sesión con ${methodsText} y luego vincularemos ${providerName}.`);
  };

  const loginWithProvider = async (provider, providerClass, providerName, sessionMethod) => {
    if (!hasFirebaseConfig || !auth || !provider) {
      setAuthError('La configuración de Firebase no es válida.');
      return;
    }

    setAuthError(null);
    setIsSocialLoading(true);
    try {
      if (auth.currentUser) {
        await signOut(auth);
        await new Promise((resolve) => setTimeout(resolve, 300));
      }

      const result = await signInWithPopup(auth, provider);
      const { user } = result;
      // En el SDK modular el perfil del proveedor solo llega por este helper:
      // result.additionalUserInfo es de la API compat y siempre es undefined.
      const profile = getAdditionalUserInfo(result)?.profile;
      const providerPhoto =
        profile?.avatar_url ||                                              // GitHub
        profile?.picture?.data?.url ||                                      // Facebook (graph API)
        (typeof profile?.picture === 'string' ? profile.picture : null) ||  // Facebook (URL directa)
        user.photoURL ||
        null;
      await finishLogin(user, sessionMethod, providerPhoto);
    } catch (error) {
      const dismissed = error?.code === 'auth/popup-closed-by-user' || error?.code === 'auth/cancelled-popup-request';

      if (error?.code === 'auth/account-exists-with-different-credential') {
        try {
          await promptAccountLinking(error, providerClass, providerName);
        } catch (linkingError) {
          console.error(`Error al preparar el enlace con ${providerName}:`, linkingError?.code, linkingError?.message);
          setAuthError(`No se pudo iniciar el proceso de vinculación con ${providerName}.`);
        }
      } else if (!dismissed) {
        console.error(`Error al iniciar sesión con ${providerName}:`, error?.code, error?.message);
        setAuthError(describeProviderError(error, providerName));
      }
    } finally {
      setIsSocialLoading(false);
    }
  };

  return {
    authError,
    setAuthError,
    isSocialLoading,
    pendingCredential,
    pendingEmail,
    pendingMethods,
    pendingProvider,
    finishLogin,
    loginWithGoogle:   () => loginWithProvider(googleProvider, GoogleAuthProvider, 'Google', 'google'),
    loginWithGithub:   () => loginWithProvider(githubProvider, GithubAuthProvider, 'GitHub', 'github'),
    loginWithFacebook: () => loginWithProvider(facebookProvider, FacebookAuthProvider, 'Facebook', 'facebook'),
  };
};
