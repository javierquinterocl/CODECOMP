import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { auth } from '../firebase/firebaseConfig';
import { saveGoogleUserToFirestore, updateActiveSessionsCodigo } from './registerService';

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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-blue-200">
      <header className="fixed left-0 right-0 top-0 z-50 border-b border-slate-200 bg-slate-50/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-4">
          <p className="font-['Space_Grotesk'] text-2xl font-bold tracking-tight">CODECOMP</p>
        </div>
      </header>

      <main className="flex min-h-screen flex-col items-center justify-center px-6 pb-12 pt-24">
        <div className="mb-10 text-center">
          <h1 className="font-['Space_Grotesk'] text-4xl font-bold tracking-tight text-slate-900">
            Completa tu perfil
          </h1>
          <p className="mt-3 text-slate-600">Es la primera vez que ingresas. Solo necesitamos un dato más.</p>
        </div>

        <div className="w-full max-w-[440px]">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-[0_20px_50px_rgba(15,23,42,0.08)] md:p-10">
            <form className="space-y-5" onSubmit={handleSubmit} noValidate>

              <div className="grid grid-cols-2 gap-4">
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
                  Código estudiantil
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

              {submitError && (
                <p className="rounded-lg bg-red-50 px-4 py-3 text-center text-xs font-medium text-red-600 border border-red-200">
                  {submitError}
                </p>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex w-full items-center justify-center rounded-lg bg-gradient-to-r from-blue-700 to-blue-500 py-3.5 font-['Space_Grotesk'] text-sm font-bold text-white transition hover:brightness-110 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Guardando...' : 'Continuar al dashboard'}
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CompleteProfilePage;
