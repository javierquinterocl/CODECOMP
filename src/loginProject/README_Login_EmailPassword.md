# Autenticación con Email/Contraseña - CodeComp

**Responsable:** Por definir

En este documento se registra la implementación del inicio de sesión y registro con Email/Contraseña mediante Firebase en el proyecto.

---

## Resumen de lo realizado

Se implementó la autenticación tradicional con correo electrónico y contraseña usando Firebase Authentication. Se integró la creación de nuevas cuentas, validación de credenciales, recuperación de contraseña y actualización del perfil de usuario en Firestore. Este método permite que los usuarios se registren sin necesidad de terceros proveedores.

---

## Herramientas utilizadas

- **Firebase Authentication**: se utiliza para el registro, autenticación y gestión de contraseñas.
- **Firestore**: se usa para persistir el perfil de usuario y metadatos de sesión.
- **React Router DOM**: se usa para la navegación condicional tras el login.
- **React Hook Form**: se puede utilizar para validación de formularios (opcional).

---

## Detalles de la implementación

### Configuración en Firebase

En Firebase Console → Authentication → Sign-in method se habilita el proveedor de **Email/Password**. Firebase proporciona métodos nativos para manejar este flujo sin necesidad de configuración adicional.

### Inicialización de métodos de autenticación

En `src/firebase/firebaseConfig.js` se utiliza la instancia de Firebase `auth` que ya está disponible:

```js
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';

export { createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail };
```

### Flujo de registro

En `src/loginProject/RegisterPage.jsx` se implementa el formulario de registro que:

1. Valida que el email sea válido
2. Valida que la contraseña cumpla con requisitos de seguridad (mínimo 6 caracteres)
3. Llama a `createUserWithEmailAndPassword(auth, email, password)`
4. En caso de éxito, crea el perfil del usuario en Firestore
5. Redirige a `CompleteProfilePage` para que complete datos adicionales

### Flujo de inicio de sesión

En `src/loginProject/LoginPage.jsx` se integra el formulario de login que:

1. Valida el email y contraseña ingresados
2. Llama a `signInWithEmailAndPassword(auth, email, password)`
3. En caso de éxito, verifica si el usuario tiene perfil completo en Firestore
4. Redirige al Dashboard si el perfil está completo, o a `CompleteProfilePage` si falta información

### Recuperación de contraseña

En `src/loginProject/RecoverPage.jsx` se implementa el flujo de recuperación de contraseña:

```js
await sendPasswordResetEmail(auth, email);
```

Firebase envía automáticamente un correo con un enlace para que el usuario restablezca su contraseña. El enlace redirige a una página personalizada donde puede crear una nueva contraseña.

### Manejo de errores

Se capturan y procesan los errores específicos de Firebase:

- `auth/email-already-in-use`: El correo ya está registrado
- `auth/invalid-email`: El formato del email no es válido
- `auth/weak-password`: La contraseña no cumple con los requisitos mínimos
- `auth/user-not-found`: El usuario no existe
- `auth/wrong-password`: La contraseña es incorrecta
- `auth/too-many-requests`: Demasiados intentos fallidos, cuenta temporalmente bloqueada

### Persistencia en Firestore

Se guardan los datos del usuario en Firestore con los siguientes campos:

```js
{
  uid: "...",
  email: "usuario@example.com",
  fullName: "Nombre del Usuario",
  studentCode: "...",
  avatar: null,
  provider: "email",
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### Validación de contraseña

Se implementa validación de contraseña con los siguientes criterios:

- Mínimo 8 caracteres (se puede ajustar)
- Al menos una letra mayúscula
- Al menos una letra minúscula
- Al menos un número
- Al menos un carácter especial (opcional)

### Actualización de perfil

Se permite que el usuario actualice su contraseña después del login usando:

```js
import { updatePassword } from 'firebase/auth';
await updatePassword(auth.currentUser, newPassword);
```

---

## Archivos modificados / involucrados

| Archivo | Acción |
|---|---|
| `src/firebase/firebaseConfig.js` | Se exportaron funciones de Email/Password |
| `src/loginProject/LoginPage.jsx` | Se agregó el formulario y lógica de login con email/contraseña |
| `src/loginProject/RegisterPage.jsx` | Se implementó el formulario de registro con validaciones |
| `src/loginProject/RecoverPage.jsx` | Se implementó el flujo de recuperación de contraseña |
| `src/loginProject/ResetPage.jsx` | Se implementó la página para resetear contraseña con enlace enviado por correo |
| `src/loginProject/registerService.js` | Se agregaron funciones para persistencia en Firestore |
| `src/loginProject/CompleteProfilePage.jsx` | Se utilizó para completar datos faltantes (nombre, código estudiantil) |
| `src/loginProject/DashboardPage.jsx` | Se mostró el perfil del usuario |

