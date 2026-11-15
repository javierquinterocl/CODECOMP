import { useState } from 'react';
import { Link } from 'react-router-dom';
import { registerUserInFirestore } from '../scripts/registerService';
import {
  errorDeCodigo, errorDeConfirmacion, errorDeContrasena, errorDeCorreo, errorDeNombre, LARGO_CODIGO,
} from '../scripts/validaciones';
import { useFormulario } from '../scripts/useFormulario';
import AuthShell from '../components/AuthShell';
import Campo, { ResumenErrores } from '../components/Campo';
import RequisitosContrasena from '../components/RequisitosContrasena';

const VALIDADORES = {
  nombre: (v) => errorDeNombre(v, 'nombre'),
  apellido: (v) => errorDeNombre(v, 'apellido'),
  codigo: errorDeCodigo,
  email: errorDeCorreo,
  password: errorDeContrasena,
  confirmPassword: (v, todo) => errorDeConfirmacion(todo.password, v),
  autoriza: (v) => (v ? null : 'Marca la casilla para autorizar el tratamiento de tus datos.'),
};

const RegisterPage = () => {
  const f = useFormulario(
    { nombre: '', apellido: '', codigo: '', email: '', password: '', confirmPassword: '', autoriza: false },
    VALIDADORES,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitError('');
    setSuccessMessage('');
    if (!f.validarTodo()) return;
    try {
      setIsSubmitting(true);
      await registerUserInFirestore(f.valores);
      setSuccessMessage('Cuenta creada. Te enviamos un correo para verificar tu dirección.');
    } catch (error) {
      setSubmitError(error.message || 'No se pudo completar el registro.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthShell
      title="Crear cuenta"
      subtitle="Construye tu futuro, línea por línea"
      action={{ to: '/', label: 'Volver al inicio' }}
      maxWidth={620}
      decorated
    >
      <form onSubmit={handleSubmit} noValidate className="nb-form">
        <div className="nb-row">
          <Campo id="nombre" label="Nombre" ayuda="Como quieres que te vean, por ejemplo «Ana»." error={f.errores.nombre}>
            <input {...f.campo('nombre')} type="text" maxLength={50} autoComplete="given-name" placeholder="Ana" />
          </Campo>
          <Campo id="apellido" label="Apellido" ayuda="Por ejemplo «Pérez»." error={f.errores.apellido}>
            <input {...f.campo('apellido')} type="text" maxLength={50} autoComplete="family-name" placeholder="Pérez" />
          </Campo>
        </div>

        <Campo id="codigo" label="Código UFPSO" ayuda={`Tu código estudiantil: ${LARGO_CODIGO} dígitos, solo números.`} error={f.errores.codigo}>
          <input {...f.campo('codigo')} type="text" inputMode="numeric" maxLength={LARGO_CODIGO} placeholder="1191000" />
        </Campo>

        <Campo id="email" label="Correo electrónico" ayuda="Mejor el institucional: ahí te llegan los avisos." error={f.errores.email}>
          <input {...f.campo('email')} type="email" maxLength={254} autoComplete="email" placeholder="nombre@ufpso.edu.co" />
        </Campo>

        <div className="nb-row">
          <Campo id="password" label="Contraseña" error={f.errores.password} describe="password-requisitos">
            <input {...f.campo('password')} type="password" autoComplete="new-password" placeholder="••••••••••" />
          </Campo>
          <Campo id="confirmPassword" label="Confirmar contraseña" ayuda="Escríbela otra vez, igual." error={f.errores.confirmPassword}>
            <input {...f.campo('confirmPassword')} type="password" autoComplete="new-password" placeholder="••••••••••" />
          </Campo>
        </div>
        <RequisitosContrasena id="password-requisitos" valor={f.valores.password} />

        <div className="nb-field">
          <label className="nb-check" htmlFor="autoriza">
            <input
              id="autoriza"
              name="autoriza"
              type="checkbox"
              checked={f.valores.autoriza}
              onChange={f.cambiar}
              onBlur={f.salir}
              aria-invalid={Boolean(f.errores.autoriza)}
              aria-describedby={f.errores.autoriza ? 'autoriza-error' : undefined}
            />
            <span>
              Autorizo el tratamiento de mis datos según la{' '}
              <Link to="/privacidad" target="_blank" rel="noopener">política de tratamiento de datos</Link>.
            </span>
          </label>
          {f.errores.autoriza && <span id="autoriza-error" className="nb-error">{f.errores.autoriza}</span>}
        </div>

        <ResumenErrores total={f.totalErrores} />
        {submitError && <div className="nb-note nb-note-error">{submitError}</div>}
        {successMessage && <div className="nb-note nb-note-ok">{successMessage}</div>}

        <button type="submit" disabled={isSubmitting} className="nb-submit">
          {isSubmitting ? 'Registrando cuenta…' : 'Registrarse'}
        </button>

        <div className="nb-panel-foot">
          <span>¿Ya tienes cuenta?</span>
          <Link to="/" state={{ openLogin: true }}>Iniciar sesión</Link>
        </div>
      </form>
    </AuthShell>
  );
};

export default RegisterPage;
