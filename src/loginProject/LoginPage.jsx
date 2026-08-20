import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FacebookAuthProvider,
  fetchSignInMethodsForEmail,
  GithubAuthProvider,
  GoogleAuthProvider,
  linkWithCredential,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import { auth, googleProvider, githubProvider, facebookProvider, hasFirebaseConfig } from '../firebase/firebaseConfig';
import { googleUserExistsInFirestore, createSessionRecord, updateUserPhotoURL } from './registerService';

const LoginPage = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [pendingCredential, setPendingCredential] = useState(null);
  const [pendingEmail, setPendingEmail] = useState('');
  const [pendingMethods, setPendingMethods] = useState([]);
  const [pendingProvider, setPendingProvider] = useState('');

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));

    setErrors((prevErrors) => {
      if (!prevErrors[name]) return prevErrors;
      const updated = { ...prevErrors };
      delete updated[name];
      return updated;
    });
  };

  const validateForm = () => {
    const newErrors = {};
    const emailRegex = /^[^\s@]{4,}@[^\s@]+\.[^\s@]{2,}$/;

    if (!formData.email.trim()) {
      newErrors.email = 'El correo electronico es obligatorio.';
    } else if (formData.email.trim().length > 254) {
      newErrors.email = 'El correo electronico debe tener maximo 254 caracteres.';
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = 'Ingresa un correo electronico valido.';
    }

    if (!formData.password) {
      newErrors.password = 'La contrasena es obligatoria.';
    } else if (formData.password.length < 6) {
      newErrors.password = 'La contrasena debe tener minimo 6 caracteres.';
    }

    return newErrors;
  };

  const clearPendingLinkState = () => {
    setPendingCredential(null);
    setPendingEmail('');
    setPendingMethods([]);
    setPendingProvider('');
  };

  const getProviderLabel = (providerId) => {
    const labels = {
      password: 'correo y contraseña',
      'google.com': 'Google',
      'github.com': 'GitHub',
      'facebook.com': 'Facebook',
    };

    return labels[providerId] || providerId;
  };

  const getPendingCredentialFromError = (error, providerClass) => {
    if (providerClass?.credentialFromError) {
      return providerClass.credentialFromError(error);
    }

    return error?.credential || null;
  };

  const promptAccountLinking = async (error, providerClass, providerName) => {
    const email = error?.customData?.email || error?.email;
    const pending = getPendingCredentialFromError(error, providerClass);

    if (!email || !pending) {
      throw error;
    }

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

  const finishLogin = async (user, method, providerPhotoURL = null) => {
    const shouldLinkPendingCredential = pendingCredential && pendingEmail && user?.email && user.email.toLowerCase() === pendingEmail.toLowerCase();

    if (pendingCredential && !shouldLinkPendingCredential) {
      clearPendingLinkState();
    }

    if (shouldLinkPendingCredential) {
      try {
        await linkWithCredential(user, pendingCredential);
        clearPendingLinkState();
      } catch (linkError) {
        console.error('Error al vincular credencial pendiente:', linkError?.code, linkError?.message);
        clearPendingLinkState();

        if (linkError?.code === 'auth/email-already-in-use') {
          setAuthError('La cuenta ya tiene ese proveedor vinculado. Inicia sesión con el método original y prueba otra vez.');
        } else {
          setAuthError('Se inició sesión, pero no se pudo vincular la otra credencial.');
        }
      }
    }

    const resolvedPhoto = user.photoURL || providerPhotoURL || null;
    if (resolvedPhoto) {
      await updateUserPhotoURL(user.uid, resolvedPhoto).catch(() => {});
    }

    try {
      await createSessionRecord(user.uid, method, user);
    } catch (sessionError) {
      console.error('Error al registrar sesión:', sessionError.message);
    }

    const exists = await googleUserExistsInFirestore(user.uid);
    navigate(exists ? '/dashboard' : '/complete-profile', { state: { photoURL: resolvedPhoto } });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validationErrors = validateForm();
    setErrors(validationErrors);
    setAuthError(null);

    if (Object.keys(validationErrors).length > 0) return;

    if (!hasFirebaseConfig || !auth) {
      setAuthError('La configuración de Firebase no es válida.');
      return;
    }

    setIsLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, formData.email.trim().toLowerCase(), formData.password);

      await finishLogin(userCredential.user, 'password');
    } catch (error) {
      if (error?.code === 'auth/user-not-found' || error?.code === 'auth/wrong-password' || error?.code === 'auth/invalid-credential') {
        setAuthError('Correo o contraseña incorrectos.');
      } else if (error?.code === 'auth/too-many-requests') {
        setAuthError('Demasiados intentos fallidos. Intenta más tarde.');
      } else {
        setAuthError('No se pudo iniciar sesión. Intenta de nuevo.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuthLogin = async (provider, providerClass, providerName, sessionMethod) => {
    if (!hasFirebaseConfig || !auth || !provider) {
      setAuthError('La configuración de Firebase no es válida.');
      return;
    }

    setAuthError(null);
    setIsGoogleLoading(true);
    try {
      if (auth.currentUser) {
        await signOut(auth);
        await new Promise((resolve) => setTimeout(resolve, 300));
      }

      const result = await signInWithPopup(auth, provider);
      const { user } = result;
      const profile = result.additionalUserInfo?.profile;
      const providerPhoto =
        profile?.avatar_url ||                    // GitHub
        profile?.picture?.data?.url ||            // Facebook (graph API)
        (typeof profile?.picture === 'string' ? profile.picture : null) || // Facebook (string URL)
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
        setAuthError(`No se pudo iniciar sesión con ${providerName}. Intenta de nuevo.`);
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    return handleOAuthLogin(googleProvider, GoogleAuthProvider, 'Google', 'google');
  };

  const handleGithubLogin = async () => {
    return handleOAuthLogin(githubProvider, GithubAuthProvider, 'GitHub', 'github');
  };

  const handleFacebookLogin = async () => {
    return handleOAuthLogin(facebookProvider, FacebookAuthProvider, 'Facebook', 'facebook');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-blue-200">

      <header className="fixed left-0 right-0 top-0 z-50 border-b border-slate-200 bg-slate-50/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-4">
          <Link to="/" className="font-['Space_Grotesk'] text-2xl font-bold tracking-tight hover:opacity-80 transition-opacity">CODECOMP</Link>
          <div className="flex items-center gap-3">
            <Link
              to="/register"
              className="rounded-lg px-4 py-2 font-['Space_Grotesk'] text-sm font-semibold text-blue-700 transition hover:bg-blue-50"
            >
              Registrarse
            </Link>
          </div>
        </div>
      </header>

      <main className="flex min-h-screen flex-col items-center justify-center px-6 pb-12 pt-24">

        <div className="mb-10 text-center">
          <h1 className="font-['Space_Grotesk'] text-4xl font-bold tracking-tight text-slate-900">
            Bienvenido de nuevo
          </h1>
          <p className="mt-3 text-slate-600">Continúa tu camino en el código.</p>
        </div>

        <div className="w-full max-w-[440px]">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-[0_20px_50px_rgba(15,23,42,0.08)] md:p-10">

            <div className="mb-7">
              <h2 className="font-['Space_Grotesk'] text-2xl font-bold tracking-tight">Iniciar sesión</h2>
              <p className="mt-1 text-sm text-slate-600">Ingresa tus credenciales para continuar.</p>
              {pendingCredential && (
                <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-medium text-amber-800">
                  Ya existe una cuenta para {pendingEmail}. Inicia sesión con {pendingMethods.length > 0 ? pendingMethods.map(getProviderLabel).join(', ') : 'el método original'}
                  {pendingProvider ? ` y luego vincularé ${pendingProvider}.` : '.'}
                </div>
              )}
            </div>

            <form className="space-y-5" onSubmit={handleSubmit} noValidate>

              <div className="space-y-2">
                <label
                  htmlFor="email"
                  className="ml-1 block font-['Space_Grotesk'] text-xs font-bold uppercase tracking-wider text-slate-600"
                >
                  Correo electrónico
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="correo@ejemplo.com"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`w-full rounded-lg border bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:bg-white ${
                    errors.email ? 'border-red-400 focus:border-red-500' : 'border-slate-200 focus:border-blue-400'
                  }`}
                />
                {errors.email && <p className="ml-1 text-xs font-medium text-red-600">{errors.email}</p>}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="password"
                    className="ml-1 block font-['Space_Grotesk'] text-xs font-bold uppercase tracking-wider text-slate-600"
                  >
                    Contraseña
                  </label>
                  <Link to="/recover" className="font-['Space_Grotesk'] text-xs font-semibold text-blue-700 hover:underline underline-offset-4">
                  ¿Olvidaste tu contraseña?
                  </Link>
                  
                </div>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleInputChange}
                    className={`w-full rounded-lg border bg-slate-50 px-4 py-3 pr-11 text-sm text-slate-900 outline-none transition focus:bg-white ${
                      errors.password ? 'border-red-400 focus:border-red-500' : 'border-slate-200 focus:border-blue-400'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(prev => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
                {errors.password && <p className="ml-1 text-xs font-medium text-red-600">{errors.password}</p>}
              </div>

              {authError && (
                <p className="rounded-lg bg-red-50 px-4 py-3 text-center text-xs font-medium text-red-600 border border-red-200">
                  {authError}
                </p>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="flex w-full items-center justify-center rounded-lg bg-gradient-to-r from-blue-700 to-blue-500 py-3.5 font-['Space_Grotesk'] text-sm font-bold text-white transition hover:brightness-110 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Iniciando sesión...' : 'Iniciar sesión'}
              </button>
            </form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-white px-4 font-['Space_Grotesk'] text-xs font-bold uppercase tracking-wider text-slate-400">
                  O continúa con
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={isGoogleLoading}
                className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 font-['Space_Grotesk'] text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Google
              </button>
              <button
                type="button"
                onClick={handleGithubLogin}
                disabled={isGoogleLoading}
                className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 font-['Space_Grotesk'] text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              >
                <svg className="h-4 w-4 text-slate-900" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.2 11.39.6.11.82-.26.82-.58 0-.29-.01-1.05-.02-2.06-3.34.73-4.04-1.61-4.04-1.61-.55-1.38-1.33-1.75-1.33-1.75-1.09-.74.08-.73.08-.73 1.2.09 1.83 1.23 1.83 1.23 1.08 1.84 2.82 1.31 3.5 1 .11-.77.42-1.3.76-1.6-2.67-.3-5.47-1.34-5.47-5.95 0-1.31.47-2.38 1.23-3.22-.12-.3-.53-1.52.12-3.17 0 0 1-.32 3.3 1.23a11.3 11.3 0 016 0c2.3-1.55 3.3-1.23 3.3-1.23.65 1.65.24 2.87.12 3.17.77.84 1.23 1.91 1.23 3.22 0 4.62-2.8 5.65-5.48 5.95.43.37.81 1.1.81 2.22 0 1.6-.01 2.9-.01 3.29 0 .32.22.7.82.58A12 12 0 0024 12c0-6.63-5.37-12-12-12z" />
                </svg>
                GitHub
              </button>
              <button
                type="button"
                onClick={handleFacebookLogin}
                disabled={isGoogleLoading}
                className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 font-['Space_Grotesk'] text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              >
                <svg className="h-5 w-5 flex-none" xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
                  <path fill="#039be5" d="M24 5A19 19 0 1 0 24 43A19 19 0 1 0 24 5Z"></path>
                  <path fill="#fff" d="M26.572,29.036h4.917l0.772-4.995h-5.69v-2.73c0-2.075,0.678-3.915,2.619-3.915h3.119v-4.359c-0.548-0.074-1.707-0.236-3.897-0.236c-4.573,0-7.254,2.415-7.254,7.917v3.323h-4.701v4.995h4.701v13.729C22.089,42.905,23.032,43,24,43c0.875,0,1.729-0.08,2.572-0.194V29.036z"></path>
                </svg>
                Facebook
              </button>
            </div>

            <div className="mt-6 flex flex-col items-center justify-between gap-3 border-t border-slate-200 pt-5 text-sm text-slate-600 md:flex-row">
              <p>¿No tienes cuenta?</p>
              <Link to="/register" className="font-semibold text-blue-700 hover:underline">
                Ir a registro
              </Link>
            </div>

          </div>
        </div>
      </main>

    </div>
  );
};

export default LoginPage;
