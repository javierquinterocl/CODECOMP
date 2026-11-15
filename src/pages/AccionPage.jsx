import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { applyActionCode, confirmPasswordReset, verifyPasswordResetCode } from 'firebase/auth';
import { auth } from '../scripts/firebaseConfig';
import AuthShell from '../components/AuthShell';
import Campo, { ResumenErrores } from '../components/Campo';
import RequisitosContrasena from '../components/RequisitosContrasena';
import { errorDeConfirmacion, errorDeContrasena } from '../scripts/validaciones';
import { useFormulario } from '../scripts/useFormulario';

// Página de los enlaces de correo (cambiar contraseña y confirmar correo). Textos borrador.

const VALIDADORES = {
  nueva: errorDeContrasena,
  repetir: (v, todo) => errorDeConfirmacion(todo.nueva, v),
};

const ERRORES = {
  'auth/expired-action-code': 'El enlace venció. Pide uno nuevo.',
  'auth/invalid-action-code': 'El enlace no es válido o ya se usó. Pide uno nuevo.',
  'auth/user-disabled': 'Esta cuenta está deshabilitada.',
  'auth/user-not-found': 'La cuenta de este enlace ya no existe.',
  'auth/weak-password': 'La contraseña es muy débil. Revisa los requisitos.',
  'auth/too-many-requests': 'Demasiados intentos. Espera unos minutos.',
};
const mensajeDe = (error) => ERRORES[error?.code] ?? 'No pudimos completar la acción. Intenta de nuevo.';

// Se lee una sola vez y se quita de la barra de direcciones: el código no queda en el historial.
const leerEnlace = () => {
  const q = new URLSearchParams(window.location.search);
  return { modo: q.get('mode'), codigo: q.get('oobCode') };
};

const CambiarContrasena = ({ codigo }) => {
  const f = useFormulario({ nueva: '', repetir: '' }, VALIDADORES);
  const [estado, setEstado] = useState('cargando'); // cargando | formulario | listo | error
  const [correo, setCorreo] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [ver, setVer] = useState(false);

  useEffect(() => {
    let vigente = true;
    verifyPasswordResetCode(auth, codigo)
      .then((email) => { if (vigente) { setCorreo(email); setEstado('formulario'); } })
      .catch((e) => { if (vigente) { setError(mensajeDe(e)); setEstado('error'); } });
    return () => { vigente = false; };
  }, [codigo]);

  const enviar = async (e) => {
    e.preventDefault();
    if (!f.validarTodo()) return;
    setEnviando(true);
    setError('');
    try {
      await confirmPasswordReset(auth, codigo, f.valores.nueva);
      setEstado('listo');
    } catch (err) {
      setError(mensajeDe(err));
    } finally {
      setEnviando(false);
    }
  };

  if (estado === 'cargando') return <p className="nb-accion-texto" role="status">Revisando el enlace…</p>;
  if (estado === 'error') return <EnlaceMalo mensaje={error} pedir="/recover" textoPedir="Pedir otro enlace" />;
  if (estado === 'listo') {
    return (
      <div className="nb-accion-ok" role="status">
        <p className="nb-accion-texto"><strong>Listo, cambiaste tu contraseña.</strong> Ya puedes entrar con la nueva.</p>
        <Link className="nb-submit nb-accion-boton" to="/" state={{ openLogin: true }}>Iniciar sesión</Link>
      </div>
    );
  }

  const ojo = (
    <button type="button" onClick={() => setVer((v) => !v)} className="nb-eye" tabIndex={-1} aria-label={ver ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
      {ver ? 'OCULTAR' : 'VER'}
    </button>
  );
  const tipo = ver ? 'text' : 'password';

  return (
    <form onSubmit={enviar} noValidate className="nb-form">
      <p className="nb-accion-texto">Cuenta: <strong>{correo}</strong></p>
      <Campo id="nueva" label="Contraseña nueva" error={f.errores.nueva} adorno={ojo} describe="accion-requisitos">
        <input {...f.campo('nueva')} type={tipo} autoComplete="new-password" placeholder="••••••••••" className="nb-input has-eye" />
      </Campo>
      <RequisitosContrasena id="accion-requisitos" valor={f.valores.nueva} />
      <Campo id="repetir" label="Repite la contraseña" ayuda="Escríbela otra vez, igual." error={f.errores.repetir} adorno={ojo}>
        <input {...f.campo('repetir')} type={tipo} autoComplete="new-password" placeholder="••••••••••" className="nb-input has-eye" />
      </Campo>
      <ResumenErrores total={f.totalErrores} />
      {error && <p className="nb-error" role="alert">{error}</p>}
      <button type="submit" disabled={enviando} className="nb-submit">{enviando ? 'Guardando…' : 'Guardar contraseña'}</button>
    </form>
  );
};

// Se confirma con un botón, no al abrir: los antivirus del correo abren los enlaces solos.
const ConfirmarCorreo = ({ codigo }) => {
  const [estado, setEstado] = useState('inicio'); // inicio | enviando | listo | error
  const [error, setError] = useState('');

  const confirmar = async () => {
    setEstado('enviando');
    try {
      await applyActionCode(auth, codigo);
      // Con la sesión abierta, el token nuevo ya dice que el correo está verificado.
      if (auth.currentUser) {
        await auth.currentUser.reload().catch(() => {});
        await auth.currentUser.getIdToken(true).catch(() => {});
      }
      setEstado('listo');
    } catch (e) {
      setError(mensajeDe(e));
      setEstado('error');
    }
  };

  if (estado === 'error') return <EnlaceMalo mensaje={error} pedir="/dashboard/cuenta" textoPedir="Pedir otro desde Mi cuenta" />;
  if (estado === 'listo') {
    return (
      <div className="nb-accion-ok" role="status">
        <p className="nb-accion-texto"><strong>Listo, confirmaste tu correo.</strong> Ya puedes recibir los avisos de CODECOMP.</p>
        <Link className="nb-submit nb-accion-boton" to="/dashboard">Ir al tablero</Link>
      </div>
    );
  }
  return (
    <div className="nb-form">
      <p className="nb-accion-texto">Pulsa el botón para confirmar que este correo es tuyo.</p>
      <button type="button" className="nb-submit" onClick={confirmar} disabled={estado === 'enviando'}>
        {estado === 'enviando' ? 'Confirmando…' : 'Confirmar mi correo'}
      </button>
    </div>
  );
};

const EnlaceMalo = ({ mensaje, pedir, textoPedir }) => (
  <div className="nb-form">
    <p className="nb-error" role="alert">{mensaje}</p>
    <Link className="nb-submit nb-accion-boton" to={pedir}>{textoPedir}</Link>
  </div>
);

const AccionPage = () => {
  const navigate = useNavigate();
  const [{ modo, codigo }] = useState(leerEnlace);

  useEffect(() => {
    document.title = 'Tu cuenta · CODECOMP';
    if (window.location.search) navigate('/accion', { replace: true });
  }, [navigate]);

  const recuperar = modo === 'resetPassword';
  const verificar = modo === 'verifyEmail';
  const valido = codigo && (recuperar || verificar);

  return (
    <AuthShell
      title={recuperar ? 'Cambiar contraseña' : verificar ? 'Confirmar correo' : 'Enlace no válido'}
      subtitle={recuperar ? 'Elige una contraseña nueva' : verificar ? 'Un paso y listo' : 'Revisa el enlace del correo'}
      action={{ to: '/', label: 'Ir al inicio' }}
      maxWidth={480}
      decorated
    >
      {!valido && <EnlaceMalo mensaje="Este enlace está incompleto. Ábrelo de nuevo desde el correo o pide uno nuevo." pedir="/recover" textoPedir="Pedir un enlace nuevo" />}
      {valido && recuperar && <CambiarContrasena codigo={codigo} />}
      {valido && verificar && <ConfirmarCorreo codigo={codigo} />}
    </AuthShell>
  );
};

export default AccionPage;
