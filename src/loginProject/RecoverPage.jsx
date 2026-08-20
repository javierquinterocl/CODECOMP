import { useState } from 'react';
import { Link } from 'react-router-dom';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth, hasFirebaseConfig } from '../firebase/firebaseConfig';

const RecoverPage = () => {

    const [formData, setFormData] = useState({
        email: '',
    });
    const [errors, setErrors] = useState({});
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [modalMessage, setModalMessage] = useState('');
    const [isError, setIsError] = useState(false);
    const handleInputChange = (event) => {
        const { name, value } = event.target;
        setFormData((prevData) => ({
            ...prevData,
        [name]: value,
        }));
        setErrors((prevErrors) => {
            if (!prevErrors[name]) return prevErrors;
            const updated = { ...prevErrors };
            delete updated[name];
            return updated;
        });
    };

    const validateForm = () => {
        const newErrors = {};
        const emailRegex = /^[^\s@]{4,}@[^\s@]+\.[^\s@]{2,}$/;

        if (!formData.email.trim()) {
        newErrors.email = 'El correo electronico es obligatorio.';
        } else if (formData.email.trim().length > 254) {
        newErrors.email = 'El correo electronico debe tener maximo 254 caracteres.';
        } else if (!emailRegex.test(formData.email)) {
        newErrors.email = 'Ingresa un correo electronico valido.';
        }

        return newErrors;
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        const validationErrors = validateForm();
        setErrors(validationErrors);

        if (Object.keys(validationErrors).length > 0) {
            setIsModalOpen(false);
            return;
        }

        if (!hasFirebaseConfig || !auth) {
            setModalMessage('La configuración de Firebase no es válida.');
            setIsError(true);
            setIsModalOpen(true);
            return;
        }

        setIsLoading(true);
        setIsError(false);
        try {
            await sendPasswordResetEmail(auth, formData.email.trim().toLowerCase());
            setModalMessage('Se ha enviado un correo de recuperación a tu dirección de email. Por favor revisa tu bandeja de entrada para continuar.');
            setIsError(false);
            setIsModalOpen(true);
            setFormData({ email: '' });
        } catch (error) {
            if (error?.code === 'auth/user-not-found') {
                setModalMessage('No encontramos una cuenta con este correo electrónico.');
            } else if (error?.code === 'auth/too-many-requests') {
                setModalMessage('Demasiados intentos. Por favor intenta más tarde.');
            } else {
                setModalMessage('No se pudo enviar el correo de recuperación. Intenta de nuevo.');
            }
            setIsError(true);
            setIsModalOpen(true);
        } finally {
            setIsLoading(false);
        }
    };
    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-blue-200">
            <header className="fixed left-0 right-0 top-0 z-50 border-b border-slate-200 bg-slate-50/95 backdrop-blur">
                <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-4">
                    <p className="font-['Space_Grotesk'] text-2xl font-bold tracking-tight">CODECOMP</p>
                    <div className="flex items-center gap-3">
                        <Link
                        to="/register"
                        className="rounded-lg px-4 py-2 font-['Space_Grotesk'] text-sm font-semibold text-blue-700 transition hover:bg-blue-50"
                        >
                        Registrarse
                        </Link>
                    </div>
                </div>
            </header>
            <main className="flex min-h-screen flex-col items-center justify-center px-6 pb-12 pt-24">
                <div className="w-full max-w-[440px]">
                    <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-[0_20px_50px_rgba(15,23,42,0.08)] md:p-10">
                        <div className="mb-7">
                            <h2 className="font-['Space_Grotesk'] text-2xl font-bold tracking-tight">Recuperar tu contraseña</h2>
                            <p className="mt-1 text-sm text-slate-600">Ingresa tu correo electrónico.</p>
                        </div>
                        <form className="space-y-5" onSubmit={handleSubmit} noValidate>
                            <div className="space-y-2">
                                <label
                                htmlFor="password"
                                className="ml-1 block font-['Space_Grotesk'] text-xs font-bold uppercase tracking-wider text-slate-600"
                                >
                                    Correo electrónico
                                </label>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    placeholder="correo@ejemplo.com"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                    className={`w-full rounded-lg border bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:bg-white ${
                                        errors.email ? 'border-red-400 focus:border-red-500' : 'border-slate-200 focus:border-blue-400'
                                    }`}
                                />
                                {errors.email && <p className="ml-1 text-xs font-medium text-red-600">{errors.email}</p>}
                            </div>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="flex w-full items-center justify-center rounded-lg bg-gradient-to-r from-blue-700 to-blue-500 py-3.5 font-['Space_Grotesk'] text-sm font-bold text-white transition hover:brightness-110 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                {isLoading ? 'Enviando...' : 'Recuperar contraseña'}
                            </button>
                        </form>
                        <div className="mt-6 flex flex-col items-center justify-between gap-3 border-t border-slate-200 pt-5 text-sm text-slate-600 md:flex-row">
                            <p>¿No quieres recuperar tu contraseña?</p>
                            <Link to="/login" className="font-semibold text-blue-700 hover:underline">
                                Ir a inicio de sesión
                            </Link>
                        </div>
                    </div>
                </div>
            </main>
            {isModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/45 px-4">
                <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-7 shadow-2xl md:p-8">
                    <div className={`mb-5 border-b pb-4 ${ isError ? 'border-red-200' : 'border-slate-200' }`}>
                    <h3 className={`font-['Space_Grotesk'] text-2xl font-bold tracking-tight ${isError ? 'text-red-600' : 'text-slate-900'}`}>
                        {isError ? 'Error' : 'Solicitud enviada'}
                    </h3>
                    <p className={`mt-1 text-sm ${isError ? 'text-red-600' : 'text-slate-600'}`}>{modalMessage}</p>
                    </div>
                    <div className="mt-7 flex justify-end">
                    <button
                        type="button"
                        onClick={() => setIsModalOpen(false)}
                        className={`rounded-lg px-5 py-2.5 font-['Space_Grotesk'] text-sm font-semibold text-white transition ${
                            isError ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-700 hover:bg-blue-800'
                        }`}
                    >
                        Cerrar
                    </button>
                    </div>
                </div>
                </div>
            )}
        </div>
    );
};

export default RecoverPage;