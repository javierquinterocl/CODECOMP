import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth, hasFirebaseConfig } from '../scripts/firebaseConfig';
import { useSocialLogin } from '../scripts/socialAuth';
import { GoogleIcon, GithubIcon, FacebookIcon } from './BrandIcons';

const emailRegex = /^[^\s@]{4,}@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Panel de inicio de sesión que se abre desde el HomePage.
 * Reutiliza el mismo flujo de Firebase que LoginPage (correo + contraseña).
 */
const LoginModal = ({ open, onClose, topOffset = '0px' }) => {
  const { authError, setAuthError, isSocialLoading, finishLogin, loginWithGoogle, loginWithGithub, loginWithFacebook } = useSocialLogin();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const firstFieldRef = useRef(null);
  const panelRef = useRef(null);
  const lastFocusedRef = useRef(null);

  // Escape para cerrar, bloqueo de scroll y manejo de foco
  useEffect(() => {
    if (!open) return;

    lastFocusedRef.current = document.activeElement;
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';

    const onKey = (e) => {
      if (e.key === 'Escape') { onClose(); return; }
      // Focus trap: mantiene el tabulador dentro del panel
      if (e.key !== 'Tab' || !panelRef.current) return;
      const focusables = panelRef.current.querySelectorAll('a[href], button:not([disabled]), input:not([disabled])');
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };

    document.addEventListener('keydown', onKey);
    const focusTimer = setTimeout(() => firstFieldRef.current?.focus(), 120);

    return () => {
      document.removeEventListener('keydown', onKey);
      clearTimeout(focusTimer);
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
      lastFocusedRef.current?.focus?.();
    };
  }, [open, onClose]);

  // Limpia las credenciales del estado al cerrar
  useEffect(() => {
    if (open) return;
    setForm({ email: '', password: '' });
    setErrors({});
    setAuthError(null);
    setShowPassword(false);
  }, [open, setAuthError]);

  if (!open) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  const validate = () => {
    const next = {};
    const email = form.email.trim();
    if (!email) next.email = 'El correo es obligatorio.';
    else if (email.length > 254) next.email = 'Máximo 254 caracteres.';
    else if (!emailRegex.test(email)) next.email = 'Ingresa un correo válido.';

    if (!form.password) next.password = 'La contraseña es obligatoria.';
    else if (form.password.length < 6) next.password = 'Mínimo 6 caracteres.';
    return next;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validate();
    setErrors(validationErrors);
    setAuthError(null);
    if (Object.keys(validationErrors).length > 0) return;

    if (!hasFirebaseConfig || !auth) {
      setAuthError('La configuración de Firebase no es válida.');
      return;
    }

    setIsLoading(true);
    try {
      const { user } = await signInWithEmailAndPassword(auth, form.email.trim().toLowerCase(), form.password);
      await finishLogin(user, 'password');
    } catch (error) {
      // Mensaje genérico: no revela si el correo existe (evita enumeración de usuarios)
      if (error?.code === 'auth/too-many-requests') {
        setAuthError('Demasiados intentos fallidos. Intenta más tarde.');
      } else if (error?.code === 'auth/network-request-failed') {
        setAuthError('Sin conexión. Revisa tu red e intenta de nuevo.');
      } else {
        setAuthError('Correo o contraseña incorrectos.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="nb-login" style={{ '--login-top': topOffset }}>
      <div className="nb-login-backdrop" onClick={onClose} aria-hidden="true" />

      <aside ref={panelRef} role="dialog" aria-modal="true" aria-label="Inicio de sesión" className="nb-login-panel">
        {/* Cabecera */}
        <div className="nb-login-head">
          <div className="nb-login-kicker">Inicio de sesión</div>
          <button type="button" onClick={onClose} title="Cerrar" aria-label="Cerrar" className="nb-modal-close">✕</button>
        </div>

        {/* Marca + gato */}
        <div className="nb-login-brand">
          <img src="/cat-pixel.png" alt="" width="512" height="512" className="nb-cat-float" />
          <div>
            <div className="nb-login-name" translate="no">CODECOMP</div>
            <div className="nb-login-sub">Ingresa con tu cuenta UFPSO</div>
          </div>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} noValidate className="nb-login-form">
          <div className="nb-field">
            <label htmlFor="lg-email" className="nb-label">Correo institucional</label>
            <input
              id="lg-email"
              name="email"
              ref={firstFieldRef}
              type="email"
              autoComplete="username"
              spellCheck={false}
              placeholder="correo@ufpso.edu.co"
              value={form.email}
              onChange={handleChange}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? 'lg-email-error' : undefined}
              className={`nb-input${errors.email ? ' is-error' : ''}`}
            />
            {errors.email && <span id="lg-email-error" className="nb-error">{errors.email}</span>}
          </div>

          <div className="nb-field">
            <label htmlFor="lg-pass" className="nb-label">Contraseña</label>
            <div className="nb-eye-wrap">
              <input
                id="lg-pass"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••••"
                value={form.password}
                onChange={handleChange}
                aria-invalid={Boolean(errors.password)}
                aria-describedby={errors.password ? 'lg-pass-error' : undefined}
                className={`nb-input has-eye${errors.password ? ' is-error' : ''}`}
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPassword((p) => !p)}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                className="nb-eye"
              >
                {showPassword ? 'OCULTAR' : 'VER'}
              </button>
            </div>
            {errors.password && <span id="lg-pass-error" className="nb-error">{errors.password}</span>}
          </div>

          <Link to="/recover" className="nb-login-link">
            ¿Olvidó su contraseña?
          </Link>

          {authError && (
            <div role="alert" className="nb-note nb-note-ok">
              {authError}
            </div>
          )}

          <button type="submit" disabled={isLoading} className="nb-modal-submit">
            {isLoading ? 'Ingresando…' : 'Ingresar'}
          </button>

          <div className="nb-login-sep">O continúa con</div>

          <div className="nb-login-oauth">
            <button type="button" onClick={loginWithGoogle} disabled={isSocialLoading} className="nb-modal-oauth" aria-label="Entrar con Google">
              <GoogleIcon className="" />
              Google
            </button>
            <button type="button" onClick={loginWithGithub} disabled={isSocialLoading} className="nb-modal-oauth" aria-label="Entrar con GitHub">
              <GithubIcon className="" />
              GitHub
            </button>
            <button type="button" onClick={loginWithFacebook} disabled={isSocialLoading} className="nb-modal-oauth" aria-label="Entrar con Facebook">
              <FacebookIcon className="" />
              Facebook
            </button>
          </div>

          <div className="nb-login-foot">
            ¿Aún no tienes cuenta? <Link to="/register">Regístrate</Link>
          </div>
        </form>
      </aside>
    </div>
  );
};

export default LoginModal;
