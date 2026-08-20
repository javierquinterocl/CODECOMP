# Autenticación con GitHub - CodeComp

**Responsable:** Andres Felipe Salas Niño

En este documento se registró lo realizado para implementar el inicio de sesión con GitHub mediante Firebase en el proyecto.

---

## Resumen de lo realizado

Se implementó la autenticación con GitHub usando Firebase Authentication y se integró la creación/actualización del perfil de usuario en Firestore. Se resolvieron casos especiales como usuarios sin correo público y la vinculación de cuentas cuando un correo ya estaba registrado con otro proveedor.

---


## Herramientas utilizadas

- **Firebase Authentication**: se utilizó para el flujo OAuth con GitHub.
- **Firestore**: se usó para persistir el perfil de usuario y metadatos de sesión.
- **React Router DOM**: se usó para la navegación condicional tras el login.

---

## Detalles de la implementación

### Configuración en GitHub

Se creó la OAuth App en GitHub (Settings → Developer settings → OAuth Apps). Se configuró la `Authorization callback URL` apuntando al manejador de Firebase: `https://<FIREBASE_PROJECT>.firebaseapp.com/__/auth/handler`.

### Configuración en Firebase

En Firebase Console → Authentication → Sign-in method se habilitó GitHub y se pegaron el `Client ID` y `Client Secret` provistos por GitHub.

### Inicialización del proveedor

En `src/firebase/firebaseConfig.js` se añadió y configuró el proveedor de GitHub:

```js
githubProvider = new GithubAuthProvider();
githubProvider.addScope('user:email');
githubProvider.setCustomParameters({
  allow_signup: 'true',
  prompt: 'login'
});
```

### Flujo de inicio de sesión

En `src/loginProject/LoginPage.jsx` se integró el botón de GitHub y el método `handleGithubLogin` que llama a `handleOAuthLogin` con `githubProvider`. Se procesó la respuesta de Firebase (`user`, `additionalUserInfo`) y se resolvió el avatar y otros datos del proveedor.

### Manejo de usuarios sin correo y vinculación de cuentas

Se registró la lógica para detectar cuando GitHub no devuelve correo y se definió que el usuario será enviado a `CompleteProfilePage` para completar los datos faltantes. Además, se implementó la preparación y vinculación de credenciales pendientes cuando el correo ya existía con otro proveedor.

### Persistencia en Firestore

Se guardaron/actualizaron los campos relevantes en el documento del usuario, incluyendo `githubId`, `githubLogin`, `profileUrl` y `avatar`, además de los campos ya usados por otros proveedores.

---

## Archivos modificados / involucrados

| Archivo | Acción |
|---|---|
| `src/firebase/firebaseConfig.js` | Se añadió y configuró `GithubAuthProvider` |
| `src/loginProject/LoginPage.jsx` | Se agregó el botón y la lógica de login con GitHub, manejo de avatar y linking |
| `src/loginProject/registerService.js` | Se actualizó la persistencia para campos de GitHub |
| `src/loginProject/CompleteProfilePage.jsx` | Se utilizó para completar datos faltantes (email, código) |
| `src/loginProject/DashboardPage.jsx` | Se mostró avatar/imagen guardada en el perfil |


