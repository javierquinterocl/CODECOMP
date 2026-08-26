import { useState } from 'react';
import { Link } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth, hasFirebaseConfig } from '../firebase/firebaseConfig';
import { useSocialLogin, getProviderLabel } from './socialAuth';
import { GoogleIcon, GithubIcon, FacebookIcon } from './components/BrandIcons';

const LoginPage = () => {
  const {
    authError, setAuthError, isSocialLoading, finishLogin,
    pendingCredential, pendingEmail, pendingMethods, pendingProvider,
    loginWithGoogle, loginWithGithub, loginWithFacebook,
  } = useSocialLogin();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

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
                onClick={loginWithGoogle}
                disabled={isSocialLoading}
                className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 font-['Space_Grotesk'] text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <GoogleIcon />
                Google
              </button>
              <button
                type="button"
                onClick={loginWithGithub}
                disabled={isSocialLoading}
                className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 font-['Space_Grotesk'] text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <GithubIcon />
                GitHub
              </button>
              <button
                type="button"
                onClick={loginWithFacebook}
                disabled={isSocialLoading}
                className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 font-['Space_Grotesk'] text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <FacebookIcon />
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
