import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { updatePassword, signOut, confirmPasswordReset } from 'firebase/auth';
import { auth, hasFirebaseConfig } from '../scripts/firebaseConfig';
import AuthShell, { AuthDialog } from '../components/AuthShell';

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
    // Tras un cambio exitoso hay que volver al inicio, pero solo cuando el
    // usuario cierre el aviso: si navegamos de una, nunca alcanza a leerlo.
    const [redirectOnClose, setRedirectOnClose] = useState(false);

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

            setModalMessage('Tu contraseña ha sido cambiada exitosamente. Inicia sesión de nuevo con la contraseña nueva.');
            setIsError(false);
            setIsModalOpen(true);
            setRedirectOnClose(true);
            setFormData({ newPassword: '', confirmPassword: '' });
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

    const handleDialogClose = () => {
        setIsModalOpen(false);
        if (redirectOnClose) navigate('/', { state: { openLogin: true } });
    };

    const eyeButton = (
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
                <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                    <div className="nb-field">
                        <label htmlFor="newPassword" className="nb-label">Contraseña nueva</label>
                        <div style={{ position: 'relative' }}>
                            <input
                                id="newPassword"
                                name="newPassword"
                                type={showPassword ? 'text' : 'password'}
                                autoComplete="new-password"
                                placeholder="••••••••••"
                                value={formData.newPassword}
                                onChange={handleInputChange}
                                className={`nb-input${errors.newPassword ? ' is-error' : ''}`}
                                style={{ paddingRight: 62 }}
                            />
                            {eyeButton}
                        </div>
                        {errors.newPassword && <span className="nb-error">{errors.newPassword}</span>}
                    </div>

                    <div className="nb-field">
                        <label htmlFor="confirmPassword" className="nb-label">Confirmar contraseña</label>
                        <div style={{ position: 'relative' }}>
                            <input
                                id="confirmPassword"
                                name="confirmPassword"
                                type={showPassword ? 'text' : 'password'}
                                autoComplete="new-password"
                                placeholder="••••••••••"
                                value={formData.confirmPassword}
                                onChange={handleInputChange}
                                className={`nb-input${errors.confirmPassword ? ' is-error' : ''}`}
                                style={{ paddingRight: 62 }}
                            />
                            {eyeButton}
                        </div>
                        {errors.confirmPassword && <span className="nb-error">{errors.confirmPassword}</span>}
                    </div>

                    <button type="submit" disabled={isLoading} className="nb-submit">
                        {isLoading ? 'Cambiando...' : 'Cambiar contraseña'}
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
