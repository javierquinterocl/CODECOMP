import { useState } from 'react';
import { Link } from 'react-router-dom';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth, hasFirebaseConfig } from '../firebase/firebaseConfig';
import AuthShell, { AuthDialog } from './components/AuthShell';

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
        <>
            <AuthShell
                title="Recuperar contraseña"
                subtitle="Te enviaremos un enlace por correo"
                action={{ to: '/register', label: 'Registrarse', variant: 'blue' }}
                maxWidth={480}
            >
                <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                    <div className="nb-field">
                        <label htmlFor="email" className="nb-label">Correo electrónico</label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            autoComplete="email"
                            placeholder="correo@ufpso.edu.co"
                            value={formData.email}
                            onChange={handleInputChange}
                            className={`nb-input${errors.email ? ' is-error' : ''}`}
                        />
                        {errors.email && <span className="nb-error">{errors.email}</span>}
                    </div>

                    <button type="submit" disabled={isLoading} className="nb-submit">
                        {isLoading ? 'Enviando...' : 'Recuperar contraseña'}
                    </button>

                    <div className="nb-panel-foot">
                        <span>¿Ya la recordaste?</span>
                        <Link to="/" state={{ openLogin: true }}>Iniciar sesión</Link>
                    </div>
                </form>
            </AuthShell>

            <AuthDialog
                open={isModalOpen}
                isError={isError}
                title={isError ? 'Error' : 'Correo enviado'}
                message={modalMessage}
                onClose={() => setIsModalOpen(false)}
            />
        </>
    );
};

export default RecoverPage;
