import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { auth } from '../scripts/firebaseConfig';
import { saveGoogleUserToFirestore, updateActiveSessionsCodigo } from '../scripts/registerService';
import AuthShell from '../components/AuthShell';
import Campo, { ResumenErrores } from '../components/Campo';
import { errorDeCodigo, errorDeNombre, LARGO_CODIGO } from '../scripts/validaciones';
import { useFormulario } from '../scripts/useFormulario';

const VALIDADORES = {
  nombre: (v) => errorDeNombre(v, 'nombre'),
  apellido: (v) => errorDeNombre(v, 'apellido'),
  codigo: errorDeCodigo,
  autoriza: (v) => (v ? null : 'Marca la casilla para autorizar el tratamiento de tus datos.'),
};

// Nombre y apellido sugeridos desde la cuenta de Google o GitHub.
const inicial = () => {
  const [nombre = '', ...resto] = (auth?.currentUser?.displayName || '').split(' ');
  return { nombre, apellido: resto.join(' '), codigo: '', autoriza: false };
};

const CompleteProfilePage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const f = useFormulario(inicial(), VALIDADORES);
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!auth?.currentUser) navigate('/', { state: { openLogin: true } });
  }, [navigate]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitError('');
    if (!f.validarTodo()) return;

    const user = auth?.currentUser;
    if (!user) {
      navigate('/', { state: { openLogin: true } });
      return;
    }

    setIsSubmitting(true);
    try {
      await saveGoogleUserToFirestore({
        uid: user.uid,
        email: user.email,
        nombre: f.valores.nombre,
        apellido: f.valores.apellido,
        codigo: f.valores.codigo,
        photoURL: location.state?.photoURL || user.photoURL || null,
      });
      await updateActiveSessionsCodigo(user.uid, f.valores.codigo);
      navigate('/dashboard');
    } catch (error) {
      setSubmitError(error.message || 'No se pudo guardar el perfil.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthShell
      title="Completa tu perfil"
      subtitle="Es la primera vez que ingresas"
      maxWidth={480}
      decorated
    >
      <form onSubmit={handleSubmit} noValidate className="nb-form">
        <div className="nb-row">
          <Campo id="nombre" label="Nombre" ayuda="Por ejemplo «Ana»." error={f.errores.nombre}>
            <input {...f.campo('nombre')} type="text" maxLength={50} autoComplete="given-name" placeholder="Ana" />
          </Campo>
          <Campo id="apellido" label="Apellido" ayuda="Por ejemplo «Pérez»." error={f.errores.apellido}>
            <input {...f.campo('apellido')} type="text" maxLength={50} autoComplete="family-name" placeholder="Pérez" />
          </Campo>
        </div>

        <Campo id="codigo" label="Código estudiantil" ayuda={`Tu código de la UFPSO: ${LARGO_CODIGO} dígitos, solo números.`} error={f.errores.codigo}>
          <input {...f.campo('codigo')} type="text" inputMode="numeric" maxLength={LARGO_CODIGO} placeholder="1191000" />
        </Campo>

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

        <button type="submit" disabled={isSubmitting} className="nb-submit">
          {isSubmitting ? 'Guardando…' : 'Continuar al dashboard'}
        </button>
      </form>
    </AuthShell>
  );
};

export default CompleteProfilePage;
