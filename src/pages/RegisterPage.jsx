import { useState } from 'react';
import { Link } from 'react-router-dom';
import { registerUserInFirestore } from '../scripts/registerService';
import AuthShell from '../components/AuthShell';

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    codigo: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const validateForm = () => {
    const newErrors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

    if (!formData.nombre.trim()) {
      newErrors.nombre = 'El nombre es obligatorio.';
    } else if (formData.nombre.trim().length > 50) {
      newErrors.nombre = 'El nombre debe tener maximo 50 caracteres.';
    }

    if (!formData.apellido.trim()) {
      newErrors.apellido = 'El apellido es obligatorio.';
    } else if (formData.apellido.trim().length > 50) {
      newErrors.apellido = 'El apellido debe tener maximo 50 caracteres.';
    }

    if (!formData.codigo.trim()) {
      newErrors.codigo = 'El codigo es obligatorio.';
    } else if (formData.codigo.trim().length > 6) {
      newErrors.codigo = 'El codigo debe tener maximo 6 caracteres.';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'El correo electronico es obligatorio.';
    } else if (formData.email.trim().length > 254) {
      newErrors.email = 'El correo electronico debe tener maximo 254 caracteres.';
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = 'Ingresa un correo electronico valido.';
    }

    if (!formData.password) {
      newErrors.password = 'La contraseña es obligatoria.';
    } else {
      const missing = [];
      if (formData.password.length < 10)              missing.push('mínimo 10 caracteres');
      if (!/[A-Z]/.test(formData.password))           missing.push('una letra mayúscula');
      if (!/[a-z]/.test(formData.password))           missing.push('una letra minúscula');
      if (!/[0-9]/.test(formData.password))           missing.push('un número');
      if (!/[^A-Za-z0-9]/.test(formData.password))   missing.push('un carácter especial');
      if (missing.length > 0) {
        newErrors.password = `La contraseña debe tener: ${missing.join(', ')}.`;
      }
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'La confirmacion de contrasena es obligatoria.';
    } else if (formData.confirmPassword !== formData.password) {
      newErrors.confirmPassword = 'Las contrasenas no coinciden.';
    }

    return newErrors;
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value
    }));

    setErrors((prevErrors) => {
      if (!prevErrors[name]) {
        return prevErrors;
      }

      const updatedErrors = { ...prevErrors };
      delete updatedErrors[name];
      return updatedErrors;
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitError('');
    setSuccessMessage('');

    const validationErrors = validateForm();
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length === 0) {
      try {
        setIsSubmitting(true);
        await registerUserInFirestore(formData);
        setSuccessMessage('Cuenta creada correctamente.');
      } catch (error) {
        setSubmitError(error.message || 'No se pudo completar el registro.');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const field = (name) => `nb-input${errors[name] ? ' is-error' : ''}`;

  return (
    <AuthShell
      title="Crear cuenta"
      subtitle="Construye tu futuro, línea por línea"
      action={{ to: '/', label: 'Volver al inicio' }}
      maxWidth={620}
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
          <label htmlFor="codigo" className="nb-label">Código UFPSO</label>
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

        <div className="nb-field">
          <label htmlFor="email" className="nb-label">Correo electrónico</label>
          <input
            id="email"
            name="email"
            type="email"
            maxLength={254}
            autoComplete="email"
            placeholder="correo@ufpso.edu.co"
            value={formData.email}
            onChange={handleInputChange}
            className={field('email')}
          />
          {errors.email && <span className="nb-error">{errors.email}</span>}
        </div>

        <div className="nb-row">
          <div className="nb-field">
            <label htmlFor="password" className="nb-label">Contraseña</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••••"
              value={formData.password}
              onChange={handleInputChange}
              className={field('password')}
            />
            {errors.password && <span className="nb-error">{errors.password}</span>}
          </div>

          <div className="nb-field">
            <label htmlFor="confirmPassword" className="nb-label">Confirmar contraseña</label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••••"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              className={field('confirmPassword')}
            />
            {errors.confirmPassword && <span className="nb-error">{errors.confirmPassword}</span>}
          </div>
        </div>

        {submitError && <div className="nb-note nb-note-error">{submitError}</div>}
        {successMessage && <div className="nb-note nb-note-ok">{successMessage}</div>}

        <button type="submit" disabled={isSubmitting} className="nb-submit">
          {isSubmitting ? 'Registrando cuenta...' : 'Registrarse'}
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
