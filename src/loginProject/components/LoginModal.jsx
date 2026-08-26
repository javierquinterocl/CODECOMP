import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth, hasFirebaseConfig } from '../../firebase/firebaseConfig';
import { useSocialLogin } from '../socialAuth';
import { GoogleIcon, GithubIcon, FacebookIcon } from './BrandIcons';

const mono = "'JetBrains Mono',monospace";
const press = "'Press Start 2P',monospace";

const labelStyle = { fontFamily: mono, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: '#fff' };
const inputStyle = { width: '100%', border: '2px solid #000', padding: '12px 14px', fontFamily: mono, fontSize: 14, color: '#000', background: '#fff', outline: 'none' };
const fieldStyle = { display: 'flex', flexDirection: 'column', gap: 7 };
const errorTextStyle = { fontFamily: mono, fontSize: 11, fontWeight: 700, color: '#FFE8E8' };

const emailRegex = /^[^\s@]{4,}@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Panel de inicio de sesión que se abre desde el HomePage.
 * Reutiliza el mismo flujo de Firebase que LoginPage (correo + contraseña).
 */
const LoginModal = ({ open, onClose, topOffset = '0px' }) => {
  const { authError, setAuthError, isSocialLoading, finishLogin, loginWithGoogle, loginWithGithub, loginWithFacebook } = useSocialLogin();
  const [mobile, setMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 720);
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const firstFieldRef = useRef(null);
  const panelRef = useRef(null);
  const lastFocusedRef = useRef(null);

  // Detecta viewport móvil para que el panel ocupe toda la pantalla
  useEffect(() => {
    const onResize = () => setMobile(window.innerWidth <= 720);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

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

  const panelTop = mobile ? '0px' : topOffset;
  const panelWidth = mobile ? '100%' : 'min(420px,92vw)';

  return (
    <div style={{ position: 'fixed', left: 0, right: 0, top: panelTop, bottom: 0, zIndex: 200, fontFamily: "'Space Grotesk',Helvetica,sans-serif" }}>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, background: 'rgba(0,0,0,0.45)', animation: 'om-fade-in 0.25s ease-out both' }}
      />

      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Inicio de sesión"
        style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: panelWidth, borderLeft: '3px solid #000', display: 'flex', flexDirection: 'column', overflowY: 'auto', background: '#0736FE', animation: 'om-slide-in 0.3s cubic-bezier(0.2,0.8,0.3,1) both' }}
      >
        {/* Cabecera */}
        <div style={{ position: 'relative', flex: '0 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, borderBottom: '3px solid #000', padding: '16px 22px' }}>
          <div style={{ fontFamily: mono, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.16em', color: '#fff' }}>Inicio de sesión</div>
          <button type="button" onClick={onClose} title="Cerrar" aria-label="Cerrar" className="nb-modal-close">✕</button>
        </div>

        {/* Marca + gato */}
        <div style={{ position: 'relative', flex: '0 0 auto', borderBottom: '3px solid #000', padding: '20px 22px', display: 'flex', alignItems: 'center', gap: 16 }}>
          <img src="/cat-pixel.png" alt="" style={{ width: 62, height: 'auto', imageRendering: 'pixelated', animation: 'om-float-b 6s ease-in-out infinite' }} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: press, fontSize: 12, lineHeight: 1.7, color: '#fff' }}>CODECOMP</div>
            <div style={{ fontFamily: mono, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: '#fff', opacity: 0.85, marginTop: 8 }}>Ingresa con tu cuenta UFPSO</div>
          </div>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} noValidate style={{ position: 'relative', padding: '24px 22px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={fieldStyle}>
            <label htmlFor="lg-email" style={labelStyle}>Correo institucional</label>
            <input
              id="lg-email"
              name="email"
              ref={firstFieldRef}
              type="email"
              autoComplete="username"
              placeholder="correo@ufpso.edu.co"
              value={form.email}
              onChange={handleChange}
              className="nb-modal-input"
              style={{ ...inputStyle, borderColor: errors.email ? '#B00020' : '#000' }}
            />
            {errors.email && <span style={errorTextStyle}>{errors.email}</span>}
          </div>

          <div style={fieldStyle}>
            <label htmlFor="lg-pass" style={labelStyle}>Contraseña</label>
            <div style={{ position: 'relative' }}>
              <input
                id="lg-pass"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••••"
                value={form.password}
                onChange={handleChange}
                className="nb-modal-input"
                style={{ ...inputStyle, paddingRight: 62, borderColor: errors.password ? '#B00020' : '#000' }}
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPassword((p) => !p)}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: mono, fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', color: '#0736FE' }}
              >
                {showPassword ? 'OCULTAR' : 'VER'}
              </button>
            </div>
            {errors.password && <span style={errorTextStyle}>{errors.password}</span>}
          </div>

          <Link to="/recover" style={{ fontFamily: mono, fontSize: 11.5, fontWeight: 700, color: '#fff', textDecoration: 'underline', alignSelf: 'flex-start' }}>
            ¿Olvidó su contraseña?
          </Link>

          {authError && (
            <div role="alert" style={{ background: '#000', border: '2px solid #000', padding: '10px 12px', fontFamily: mono, fontSize: 12, fontWeight: 700, color: '#fff' }}>
              {authError}
            </div>
          )}

          <button type="submit" disabled={isLoading} className="nb-modal-submit">
            {isLoading ? 'Ingresando...' : 'Ingresar'}
          </button>

          {/* Separador */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
            <span style={{ flex: 1, height: 2, background: '#000' }} />
            <span style={{ fontFamily: mono, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: '#fff' }}>O continúa con</span>
            <span style={{ flex: 1, height: 2, background: '#000' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
            <button type="button" onClick={loginWithGoogle} disabled={isSocialLoading} className="nb-modal-oauth" aria-label="Entrar con Google">
              <GoogleIcon className="" style={{ width: 18, height: 18 }} />
              Google
            </button>
            <button type="button" onClick={loginWithGithub} disabled={isSocialLoading} className="nb-modal-oauth" aria-label="Entrar con GitHub">
              <GithubIcon className="" style={{ width: 18, height: 18, color: '#000' }} />
              GitHub
            </button>
            <button type="button" onClick={loginWithFacebook} disabled={isSocialLoading} className="nb-modal-oauth" aria-label="Entrar con Facebook">
              <FacebookIcon className="" style={{ width: 18, height: 18 }} />
              Facebook
            </button>
          </div>

          <div style={{ borderTop: '2px solid #000', paddingTop: 14, fontSize: 13, fontWeight: 500, color: '#fff' }}>
            ¿Aún no tienes cuenta? <Link to="/register" style={{ fontWeight: 700, color: '#fff', textDecoration: 'underline' }}>Regístrate</Link>
          </div>
        </form>
      </aside>
    </div>
  );
};

export default LoginModal;
