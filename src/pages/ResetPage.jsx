import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { updatePassword, signOut, confirmPasswordReset } from 'firebase/auth';
import { auth, hasFirebaseConfig } from '../scripts/firebaseConfig';
import AuthShell, { AuthDialog } from '../components/AuthShell';
import Campo, { ResumenErrores } from '../components/Campo';
import RequisitosContrasena from '../components/RequisitosContrasena';
import { errorDeConfirmacion, errorDeContrasena } from '../scripts/validaciones';
import { useFormulario } from '../scripts/useFormulario';

const VALIDADORES = {
  newPassword: errorDeContrasena,
  confirmPassword: (v, todo) => errorDeConfirmacion(todo.newPassword, v),
};

const ResetPage = () => {
  const navigate = useNavigate();
  const f = useFormulario({ newPassword: '', confirmPassword: '' }, VALIDADORES);
  const [showPassword, setShowPassword] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [isError, setIsError] = useState(false);
  // Tras un cambio exitoso hay que volver al inicio, pero solo cuando el
  // usuario cierre el aviso: si navegamos de una, nunca alcanza a leerlo.
  const [redirectOnClose, setRedirectOnClose] = useState(false);

  const avisar = (mensaje, error) => {
    setModalMessage(mensaje);
    setIsError(error);
    setIsModalOpen(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!f.validarTodo()) return;
    if (!hasFirebaseConfig || !auth) return avisar('La configuración de Firebase no es válida.', true);

    const oobCode = new URLSearchParams(window.location.search).get('oobCode');
    const user = auth.currentUser;
    if (!user && !oobCode) {
      navigate('/recover');
      return undefined;
    }

    setIsLoading(true);
    try {
      if (oobCode) {
        await confirmPasswordReset(auth, oobCode, f.valores.newPassword);
      } else {
        await updatePassword(user, f.valores.newPassword);
        await signOut(auth);
      }
      avisar('Tu contraseña ha sido cambiada. Inicia sesión de nuevo con la contraseña nueva.', false);
      setRedirectOnClose(true);
      f.reiniciar();
    } catch (error) {
      const mensajes = {
        'auth/weak-password': 'La nueva contraseña es demasiado débil.',
        'auth/invalid-action-code': 'El enlace de recuperación no es válido o ya fue usado. Solicita uno nuevo.',
        'auth/expired-action-code': 'El enlace de recuperación expiró. Solicita uno nuevo.',
        'auth/requires-recent-login': 'Por seguridad, Firebase pide un inicio de sesión reciente. Cierra sesión y vuelve a entrar, o usa «¿Olvidaste tu contraseña?» para recibir un enlace por correo.',
        'auth/too-many-requests': 'Demasiados intentos. Por favor intenta más tarde.',
      };
      avisar(mensajes[error?.code] ?? 'No se pudo cambiar la contraseña. Intenta de nuevo.', true);
    } finally {
      setIsLoading(false);
    }
    return undefined;
  };

  const handleDialogClose = () => {
    setIsModalOpen(false);
    if (redirectOnClose) navigate('/', { state: { openLogin: true } });
  };

  const ojo = (
    <button
      type="button"
      onClick={() => setShowPassword((prev) => !prev)}
      className="nb-eye"
      tabIndex={-1}
      aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
    >
      {showPassword ? 'OCULTAR' : 'VER'}
    </button>
  );
  const tipo = showPassword ? 'text' : 'password';

  return (
    <>
      <AuthShell
        title="Cambiar contraseña"
        subtitle="Ingresa tu nueva contraseña"
        action={{ to: '/dashboard', label: 'Volver al dashboard' }}
        home="/dashboard"
        maxWidth={480}
        decorated
      >
        <form onSubmit={handleSubmit} noValidate className="nb-form">
          <Campo id="newPassword" label="Contraseña nueva" error={f.errores.newPassword} adorno={ojo} describe="reset-requisitos">
            <input {...f.campo('newPassword')} type={tipo} autoComplete="new-password" placeholder="••••••••••" className="nb-input has-eye" />
          </Campo>
          <RequisitosContrasena id="reset-requisitos" valor={f.valores.newPassword} />

          <Campo id="confirmPassword" label="Confirmar contraseña" ayuda="Escríbela otra vez, igual." error={f.errores.confirmPassword} adorno={ojo}>
            <input {...f.campo('confirmPassword')} type={tipo} autoComplete="new-password" placeholder="••••••••••" className="nb-input has-eye" />
          </Campo>

          <ResumenErrores total={f.totalErrores} />

          <button type="submit" disabled={isLoading} className="nb-submit">
            {isLoading ? 'Cambiando…' : 'Cambiar contraseña'}
          </button>

          <div className="nb-panel-foot">
            <span>¿Mejor no?</span>
            <Link to="/dashboard">Ir al dashboard</Link>
          </div>
        </form>
      </AuthShell>

      <AuthDialog
        open={isModalOpen}
        isError={isError}
        title={isError ? 'Error' : 'Contraseña cambiada'}
        message={modalMessage}
        onClose={handleDialogClose}
      />
    </>
  );
};

export default ResetPage;
