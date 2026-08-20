import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { updatePassword, signOut, confirmPasswordReset } from 'firebase/auth';
import { auth, hasFirebaseConfig } from '../firebase/firebaseConfig';

const ResetPage = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        newPassword: '',
        confirmPassword: '',
    });
    const [errors, setErrors] = useState({});
    const [showPassword, setShowPassword] = useState(false);
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
        const specialCharacterRegex = /[^A-Za-z0-9]/;
        if (!formData.newPassword) {
        newErrors.newPassword = 'La contrasena es obligatoria.';
        } else if (formData.newPassword.length < 6) {
        newErrors.newPassword = 'La contrasena debe tener minimo 6 caracteres.';
        } else if (!specialCharacterRegex.test(formData.newPassword)) {
            newErrors.newPassword = 'La contrasena debe incluir al menos un caracter especial.';
        }

        if (!formData.confirmPassword) {
            newErrors.confirmPassword = 'Debes confirmar la contrasena.';
        } else if (formData.confirmPassword !== formData.newPassword) {
            newErrors.confirmPassword = 'Las contrasenas no coinciden.';
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

        const searchParams = new URLSearchParams(window.location.search);
        const oobCode = searchParams.get('oobCode');

        const user = auth.currentUser;
        if (!user && !oobCode) {
            navigate('/recover');
            return;
        }

        setIsLoading(true);
        setIsError(false);
        try {
            if (oobCode) {
                await confirmPasswordReset(auth, oobCode, formData.newPassword);
            } else {
                await updatePassword(user, formData.newPassword);
                await signOut(auth);
            }

            setModalMessage('Tu contraseña ha sido cambiada exitosamente.');
            setIsError(false);
            setIsModalOpen(true);
            setFormData({ newPassword: '', confirmPassword: '' });
            navigate('/login');
        } catch (error) {
            if (error?.code === 'auth/weak-password') {
                setModalMessage('La nueva contraseña es demasiado débil.');
            } else if (error?.code === 'auth/invalid-action-code') {
                setModalMessage('El enlace de recuperación no es válido o ya fue usado. Solicita uno nuevo.');
            } else if (error?.code === 'auth/expired-action-code') {
                setModalMessage('El enlace de recuperación expiró. Solicita uno nuevo.');
            } else if (error?.code === 'auth/requires-recent-login') {
                setModalMessage('Por seguridad, necesitas iniciar sesión nuevamente o usar la opción de recuperación por correo.');
            } else if (error?.code === 'auth/too-many-requests') {
                setModalMessage('Demasiados intentos. Por favor intenta más tarde.');
            } else {
                setModalMessage('No se pudo cambiar la contraseña. Intenta de nuevo.');
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
                            <h2 className="font-['Space_Grotesk'] text-2xl font-bold tracking-tight">Cambiar tu contraseña</h2>
                            <p className="mt-1 text-sm text-slate-600">Ingresa tu nueva contraseña y confírmala.</p>
                        </div>
                        <form className="space-y-5" onSubmit={handleSubmit} noValidate>
                            <div className="space-y-2">
                                <label
                                htmlFor="newPassword"
                                className="ml-1 block font-['Space_Grotesk'] text-xs font-bold uppercase tracking-wider text-slate-600"
                                >
                                    Contraseña nueva
                                </label>
                                <div className="relative">
                                    <input
                                        id="newPassword"
                                        name="newPassword"
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder="••••••••"
                                        value={formData.newPassword}
                                        onChange={handleInputChange}
                                        className={`w-full rounded-lg border bg-slate-50 px-4 py-3 pr-11 text-sm text-slate-900 outline-none transition focus:bg-white ${
                                            errors.newPassword ? 'border-red-400 focus:border-red-500' : 'border-slate-200 focus:border-blue-400'
                                        }`}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(prev => !prev)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                        tabIndex={-1}
                                    >
                                        {showPassword ? (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                        </svg>
                                        ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                        )}
                                    </button>
                                </div>
                                {errors.newPassword && <p className="ml-1 text-xs font-medium text-red-600">{errors.newPassword}</p>}
                            </div>
                            <div className="space-y-2">
                                <label
                                htmlFor="confirmPassword"
                                className="ml-1 block font-['Space_Grotesk'] text-xs font-bold uppercase tracking-wider text-slate-600"
                                >
                                    Confirmar contraseña
                                </label>
                                <div className="relative">
                                    <input
                                        id="confirmPassword"
                                        name="confirmPassword"
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder="••••••••"
                                        value={formData.confirmPassword}
                                        onChange={handleInputChange}
                                        className={`w-full rounded-lg border bg-slate-50 px-4 py-3 pr-11 text-sm text-slate-900 outline-none transition focus:bg-white ${
                                            errors.confirmPassword ? 'border-red-400 focus:border-red-500' : 'border-slate-200 focus:border-blue-400'
                                        }`}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(prev => !prev)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                        tabIndex={-1}
                                    >
                                        {showPassword ? (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                        </svg>
                                        ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                        )}
                                    </button>
                                </div>
                                {errors.confirmPassword && <p className="ml-1 text-xs font-medium text-red-600">{errors.confirmPassword}</p>}
                            </div>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="flex w-full items-center justify-center rounded-lg bg-gradient-to-r from-blue-700 to-blue-500 py-3.5 font-['Space_Grotesk'] text-sm font-bold text-white transition hover:brightness-110 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                {isLoading ? 'Cambiando...' : 'Cambiar contraseña'}
                            </button>
                        </form>
                        <div className="mt-6 flex flex-col items-center justify-between gap-3 border-t border-slate-200 pt-5 text-sm text-slate-600 md:flex-row">
                            <p>¿No quieres cambiar tu contraseña?</p>
                            <Link to="/dashboard" className="font-semibold text-blue-700 hover:underline">
                                Ir a dashboard
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
                                {isError ? 'Error' : 'Operación exitosa'}
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

export default ResetPage;