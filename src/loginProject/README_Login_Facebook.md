# Autenticación con Facebook - CodeComp

**Responsable:** Por definir

En este documento se registra la implementación del inicio de sesión con Facebook mediante Firebase en el proyecto.

---

## Resumen de lo realizado

Se implementó la autenticación con Facebook usando Firebase Authentication y se integró la creación/actualización del perfil de usuario en Firestore. Se obtiene automáticamente la foto de perfil y otros datos del usuario desde Facebook sin necesidad de completar formularios adicionales.

---

## Herramientas utilizadas

- **Firebase Authentication**: se utiliza para el flujo OAuth con Facebook.
- **Firestore**: se usa para persistir el perfil de usuario y metadatos de sesión.
- **React Router DOM**: se usa para la navegación condicional tras el login.
- **Facebook Developers**: plataforma para crear y configurar la aplicación de Facebook.

---

## Detalles de la implementación

### Configuración en Facebook Developers

Se creó una aplicación en [Facebook Developers](https://developers.facebook.com/). Se configuró el producto de "Facebook Login" y se obtuvieron el `App ID` y `App Secret`. En la sección de configuración de OAuth, se añadió la URL de redirección de Firebase: `https://<FIREBASE_PROJECT>.firebaseapp.com/__/auth/handler`.

### Configuración en Firebase

En Firebase Console → Authentication → Sign-in method se habilitó Facebook y se pegaron el `App ID` y `App Secret` provistos por Facebook Developers.

### Inicialización del proveedor

En `src/firebase/firebaseConfig.js` se añadió y configuró el proveedor de Facebook:

```js
const facebookProvider = new FacebookAuthProvider();
facebookProvider.addScope('email');
facebookProvider.addScope('public_profile');
facebookProvider.setCustomParameters({
  display: 'popup'
});
```

### Flujo de inicio de sesión

En `src/loginProject/LoginPage.jsx` se integró el botón de Facebook y el método `handleFacebookLogin` que llama a `signInWithPopup` con `facebookProvider`. Se procesa la respuesta de Firebase (`user`, `additionalUserInfo`) para obtener los datos básicos del usuario.

### Obtención de datos del perfil

Se extraen automáticamente de la respuesta de Facebook:
- Nombre completo
- Correo electrónico
- Foto de perfil
- ID de Facebook

### Manejo de usuarios nuevos y existentes

Se verifica en Firestore si el usuario ya tiene un perfil creado:

- **Si ya existe** → se redirige directo al Dashboard.
- **Si es nuevo** → se redirige a `CompleteProfilePage` para completar datos adicionales como el código estudiantil. El nombre y correo se pre-rellenan automáticamente con los datos de Facebook.

### Persistencia en Firestore

Se guardan/actualizan los campos relevantes en el documento del usuario, incluyendo `facebookId`, `avatar`, `email` y otros datos de perfil.

### Vinculación de cuentas

Si un usuario intenta entrar con Facebook pero su correo ya estaba registrado con otro proveedor (GitHub, Google, etc.), la aplicación lo detecta y prepara la vinculación de credenciales para unificar las cuentas.

---

## Archivos modificados / involucrados

| Archivo | Acción |
|---|---|
| `src/firebase/firebaseConfig.js` | Se añadió y configuró `FacebookAuthProvider` |
| `src/loginProject/LoginPage.jsx` | Se agregó el botón y la lógica de login con Facebook, extracción de datos de perfil |
| `src/loginProject/registerService.js` | Se actualizó la persistencia para campos de Facebook |
| `src/loginProject/CompleteProfilePage.jsx` | Se utilizó para completar datos faltantes (código estudiantil) |
| `src/loginProject/DashboardPage.jsx` | Se mostró avatar/imagen guardada en el perfil |


