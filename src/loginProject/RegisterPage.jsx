import { useState } from 'react';
import { Link } from 'react-router-dom';
import { registerUserInFirestore } from './registerService';

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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-blue-200">
      <header className="fixed left-0 right-0 top-0 z-50 border-b border-slate-200 bg-slate-50/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-4">
          <Link to="/" className="font-['Space_Grotesk'] text-2xl font-bold tracking-tight hover:opacity-80 transition-opacity">CODECOMP</Link>
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="rounded-lg px-4 py-2 font-['Space_Grotesk'] text-sm font-semibold text-blue-700 transition hover:bg-blue-50"
            >
              Iniciar sesión
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto grid min-h-screen w-full max-w-7xl grid-cols-1 items-center gap-12 px-6 pb-10 pt-28 lg:grid-cols-12">
        <section className="space-y-8 lg:col-span-5">
          <div>
            <h1 className="font-['Space_Grotesk'] text-4xl font-bold leading-tight tracking-tight md:text-5xl">
              Construye tu futuro,
              <br />
              <span className="text-blue-700">linea por linea.</span>
            </h1>
            <p className="mt-4 max-w-md text-base leading-relaxed text-slate-600 md:text-lg">
              Registra tu cuenta para acceder a tus ejercicios y seguir practicando tu logica de programación de manera
              organizada.
            </p>
          </div>

    
        </section>

        <section className="lg:col-span-7 lg:flex lg:justify-end">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-8 shadow-[0_20px_50px_rgba(15,23,42,0.08)] md:p-10">
            <div className="mb-7">
              <h2 className="font-['Space_Grotesk'] text-2xl font-bold tracking-tight">Crear cuenta</h2>
              <p className="mt-1 text-sm text-slate-600">Completa los datos para registrarte.</p>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit} noValidate>
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor="nombre" className="ml-1 block font-['Space_Grotesk'] text-xs font-bold uppercase tracking-wider text-slate-600">
                    Nombre
                  </label>
                  <input
                    id="nombre"
                    name="nombre"
                    type="text"
                    maxLength={50}
                    placeholder="Tu nombre"
                    value={formData.nombre}
                    onChange={handleInputChange}
                    className={`w-full rounded-lg border bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:bg-white ${
                      errors.nombre ? 'border-red-400 focus:border-red-500' : 'border-slate-200 focus:border-blue-400'
                    }`}
                  />
                  {errors.nombre && <p className="ml-1 text-xs font-medium text-red-600">{errors.nombre}</p>}
                </div>

                <div className="space-y-2">
                  <label htmlFor="apellido" className="ml-1 block font-['Space_Grotesk'] text-xs font-bold uppercase tracking-wider text-slate-600">
                    Apellido
                  </label>
                  <input
                    id="apellido"
                    name="apellido"
                    type="text"
                    maxLength={50}
                    placeholder="Tu apellido"
                    value={formData.apellido}
                    onChange={handleInputChange}
                    className={`w-full rounded-lg border bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:bg-white ${
                      errors.apellido ? 'border-red-400 focus:border-red-500' : 'border-slate-200 focus:border-blue-400'
                    }`}
                  />
                  {errors.apellido && <p className="ml-1 text-xs font-medium text-red-600">{errors.apellido}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="codigo" className="ml-1 block font-['Space_Grotesk'] text-xs font-bold uppercase tracking-wider text-slate-600">
                  Código
                </label>
                <input
                  id="codigo"
                  name="codigo"
                  type="text"
                  maxLength={6}
                  placeholder="Ej: 191000"
                  value={formData.codigo}
                  onChange={handleInputChange}
                  className={`w-full rounded-lg border bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:bg-white ${
                    errors.codigo ? 'border-red-400 focus:border-red-500' : 'border-slate-200 focus:border-blue-400'
                  }`}
                />
                {errors.codigo && <p className="ml-1 text-xs font-medium text-red-600">{errors.codigo}</p>}
              </div>

              <div className="space-y-2">
                <label htmlFor="email" className="ml-1 block font-['Space_Grotesk'] text-xs font-bold uppercase tracking-wider text-slate-600">
                  Correo electrónico
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  maxLength={254}
                  placeholder="correo@ejemplo.com"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`w-full rounded-lg border bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:bg-white ${
                    errors.email ? 'border-red-400 focus:border-red-500' : 'border-slate-200 focus:border-blue-400'
                  }`}
                />
                {errors.email && <p className="ml-1 text-xs font-medium text-red-600">{errors.email}</p>}
              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor="password" className="ml-1 block font-['Space_Grotesk'] text-xs font-bold uppercase tracking-wider text-slate-600">
                    Contraseña
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="********"
                    value={formData.password}
                    onChange={handleInputChange}
                    className={`w-full rounded-lg border bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:bg-white ${
                      errors.password ? 'border-red-400 focus:border-red-500' : 'border-slate-200 focus:border-blue-400'
                    }`}
                  />
                  {errors.password && <p className="ml-1 text-xs font-medium text-red-600">{errors.password}</p>}
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="confirmPassword"
                    className="ml-1 block font-['Space_Grotesk'] text-xs font-bold uppercase tracking-wider text-slate-600"
                  >
                    Confirmar contraseña
                  </label>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    placeholder="********"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className={`w-full rounded-lg border bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:bg-white ${
                      errors.confirmPassword ? 'border-red-400 focus:border-red-500' : 'border-slate-200 focus:border-blue-400'
                    }`}
                  />
                  {errors.confirmPassword && (
                    <p className="ml-1 text-xs font-medium text-red-600">{errors.confirmPassword}</p>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex w-full items-center justify-center rounded-lg bg-gradient-to-r from-blue-700 to-blue-500 py-3.5 font-['Space_Grotesk'] text-sm font-bold text-white transition hover:brightness-110 active:scale-[0.99]"
              >
                {isSubmitting ? 'Registrando cuenta...' : 'Registrarse'}
              </button>

              {submitError && <p className="text-sm font-medium text-red-600">{submitError}</p>}
              {successMessage && <p className="text-sm font-medium text-emerald-700">{successMessage}</p>}
            </form>

            <div className="mt-6 flex flex-col items-center justify-between gap-3 border-t border-slate-200 pt-5 text-sm text-slate-600 md:flex-row">
              <p>Ya tienes cuenta?</p>
              <Link to="/login" className="font-semibold text-blue-700 hover:underline">
                Ir a inicio de sesión
              </Link>
            </div>
          </div>
        </section>
      </main>

    </div>
  );
};

export default RegisterPage;