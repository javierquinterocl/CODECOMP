import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { auth } from '../scripts/firebaseConfig';
import { saveGoogleUserToFirestore, updateActiveSessionsCodigo } from '../scripts/registerService';
import AuthShell from '../components/AuthShell';

const CompleteProfilePage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [formData, setFormData] = useState({ nombre: '', apellido: '', codigo: '' });
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const user = auth?.currentUser;
    if (!user) {
      navigate('/', { state: { openLogin: true } });
      return;
    }
    const [nombre = '', ...rest] = (user.displayName || '').split(' ');
    setFormData((prev) => ({ ...prev, nombre, apellido: rest.join(' ') }));
  }, [navigate]);

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => {
      if (!prev[name]) return prev;
      const updated = { ...prev };
      delete updated[name];
      return updated;
    });
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.nombre.trim()) newErrors.nombre = 'El nombre es obligatorio.';
    else if (formData.nombre.trim().length > 50) newErrors.nombre = 'Máximo 50 caracteres.';

    if (!formData.apellido.trim()) newErrors.apellido = 'El apellido es obligatorio.';
    else if (formData.apellido.trim().length > 50) newErrors.apellido = 'Máximo 50 caracteres.';

    if (!formData.codigo.trim()) newErrors.codigo = 'El código es obligatorio.';
    else if (formData.codigo.trim().length > 6) newErrors.codigo = 'El código debe tener máximo 6 caracteres.';

    return newErrors;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitError('');
    const validationErrors = validate();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

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
        nombre: formData.nombre,
        apellido: formData.apellido,
        codigo: formData.codigo,
        photoURL: location.state?.photoURL || user.photoURL || null,
      });
      await updateActiveSessionsCodigo(user.uid, formData.codigo);
      navigate('/dashboard');
    } catch (error) {
      setSubmitError(error.message || 'No se pudo guardar el perfil.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const field = (name) => `nb-input${errors[name] ? ' is-error' : ''}`;

  return (
    <AuthShell
      title="Completa tu perfil"
      subtitle="Es la primera vez que ingresas"
      maxWidth={480}
      decorated
    >
      <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div className="nb-row">
          <div className="nb-field">
            <label htmlFor="nombre" className="nb-label">Nombre</label>
            <input
              id="nombre"
              name="nombre"
              type="text"
              maxLength={50}
              autoComplete="given-name"
              placeholder="Tu nombre"
              value={formData.nombre}
              onChange={handleInputChange}
              className={field('nombre')}
            />
            {errors.nombre && <span className="nb-error">{errors.nombre}</span>}
          </div>

          <div className="nb-field">
            <label htmlFor="apellido" className="nb-label">Apellido</label>
            <input
              id="apellido"
              name="apellido"
              type="text"
              maxLength={50}
              autoComplete="family-name"
              placeholder="Tu apellido"
              value={formData.apellido}
              onChange={handleInputChange}
              className={field('apellido')}
            />
            {errors.apellido && <span className="nb-error">{errors.apellido}</span>}
          </div>
        </div>

        <div className="nb-field">
          <label htmlFor="codigo" className="nb-label">Código estudiantil</label>
          <input
            id="codigo"
            name="codigo"
            type="text"
            maxLength={6}
            placeholder="Ej: 191000"
            value={formData.codigo}
            onChange={handleInputChange}
            className={field('codigo')}
          />
          {errors.codigo && <span className="nb-error">{errors.codigo}</span>}
        </div>

        {submitError && <div className="nb-note nb-note-error">{submitError}</div>}

        <button type="submit" disabled={isSubmitting} className="nb-submit">
          {isSubmitting ? 'Guardando...' : 'Continuar al dashboard'}
        </button>
      </form>
    </AuthShell>
  );
};

export default CompleteProfilePage;
