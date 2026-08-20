# Autenticacion con Google - CodeComp

**Responsable:** Javier Andres Quintero Clavijo

Este documento explica de forma general como se implemento el inicio de sesion con Google en el proyecto.

---

## Que se logro

El usuario puede iniciar sesion o registrarse en CodeComp usando su cuenta de Google. Al hacerlo, la aplicacion obtiene automaticamente su nombre, correo y foto de perfil, sin necesidad de llenar un formulario largo.

---

## Herramientas utilizadas

- **Firebase Authentication:** servicio de Google que maneja todo el proceso de autenticacion de forma segura.
- **Firestore:** base de datos donde se guardan los datos del perfil del usuario.
- **React Router DOM:** para navegar entre pantallas segun si el usuario es nuevo o ya esta registrado.

---

## Paso a paso de la implementacion

### 1. Configuracion en Firebase Console

Se creo un proyecto en Firebase, se activo el proveedor de autenticacion **Google** y se obtuvieron las credenciales del proyecto. Estas credenciales se guardaron en un archivo `.env` para no exponerlas en el codigo.

### 2. Conexion de Firebase con el proyecto

Se creo el archivo `firebaseConfig.js` que inicializa Firebase y prepara el proveedor de Google:

```js
googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });
```

El parametro `select_account` obliga a Google a mostrar el selector de cuentas cada vez, aunque el usuario ya tenga una sesion activa en el navegador.

### 3. Boton de inicio de sesion con Google

En `LoginPage.jsx` se agrego un boton que al hacer clic abre el popup de Google:

```js
const result = await signInWithPopup(auth, googleProvider);
```

Firebase se encarga de abrir la ventana de Google, validar la cuenta y devolver los datos del usuario.

### 4. Obtener la foto de perfil

Luego de autenticar, se extrae la foto de perfil directamente de los datos que devuelve Google:

```js
const providerPhoto = profile?.picture || user.photoURL || null;
```

### 5. Usuario nuevo o ya registrado

Se verifica en Firestore si el usuario ya tiene un perfil creado:

- **Si ya existe** → se redirige directo al Dashboard.
- **Si es nuevo** → se redirige a una pantalla intermedia (`CompleteProfilePage`) donde ingresa su codigo estudiantil. El nombre y apellido se pre-rellenan automaticamente con los datos de Google.

### 6. Guardar el perfil en Firestore

Al completar el formulario, se crea el documento del usuario en la base de datos con todos sus datos, incluyendo la foto de perfil obtenida de Google.

### 7. Mostrar la foto en el Dashboard

En el Dashboard se consulta la foto guardada y se muestra en el perfil del usuario. Si por alguna razon la imagen no carga, se muestra la inicial del nombre como alternativa.

### 8. Vinculacion de cuentas

Si un usuario intenta entrar con Google pero su correo ya estaba registrado con otro metodo (por ejemplo, con GitHub), la aplicacion lo detecta y guia al usuario para vincular ambas cuentas en lugar de mostrar un error.

---

## Archivos involucrados

| Archivo | Funcion |
|---|---|
| `src/firebase/firebaseConfig.js` | Configuracion de Firebase y proveedor Google |
| `src/loginProject/LoginPage.jsx` | Boton de Google y logica de autenticacion |
| `src/loginProject/CompleteProfilePage.jsx` | Formulario para usuarios nuevos |
| `src/loginProject/registerService.js` | Funciones para guardar y consultar datos en Firestore |
| `src/loginProject/DashboardPage.jsx` | Visualizacion de la foto de perfil |
