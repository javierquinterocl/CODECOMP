# CodeComp - Módulos adicionales (React + Firebase)

## URL pública CodeComp: https://code-comp-e73c7.web.app/

## Descripcion del proyecto
Este repositorio hace parte de CodeComp, una plataforma de aprendizaje progresivo con retroalimentacion automatizada para fortalecer las habilidades de los estudiantes de Ingenieria de Sistemas de la Universidad Francisco de Paula Santander.

Los módulos adicionales implementan los servicios de Torneos, Grupos y Retos Diarios en la plataforma, con una funcionalidad CRUD completa (Create, Read, Update, Delete), además se añade un generador de PDF para el módulo de Usuarios y una página de inicio concreta.

## Integrantes del equipo y aportes realizados

| Integrante | Aportes |
|---|---|
| Andres Felipe Salas Nino | TournamentsPage, Generador de PDF para reportes historial de Usuario |
| Javier Andres Quintero Clavijo | HomePage, GruposPage |
| Andrey Castilla Contreras | DailyChallengesPage, documentación |


## Tecnologias utilizadas
- React 19
- Vite
- JavaScript
- Tailwind CSS
- CSS
- ESLint
- npm
- Firebase (Authentication + Firestore)
- React Router DOM v7

## Alcance actual de módulos adicionales

Ademas del módulo de autenticacion, se han desarrollado los siguientes módulos funcionales:

- **Módulo de Grupos**: creacion y gestion de grupos de estudiantes con roles definidos para torneos.
- **Módulo de Retos Diarios**: creacion y gestion de desafios de programacion con diferentes niveles de dificultad.
- **Módulo de Torneos**: organizacion de competencias con sistema de registro de equipos y gestion de fechas.
- **Página de Inicio**: interfaz moderna de bienvenida con animaciones.
- **Generador de PDF**: descarga de reportes completos del historial de sesiones en formato profesional.


## Funcionalidad de Grupos (GruposPage)
**Responsable:** Javier Andres Quintero Clavijo

La pagina de Grupos permite a los administradores crear, gestionar y organizar grupos de estudiantes para participar en torneos.

Asi funciona:
- Se pueden crear nuevos grupos especificando el nombre, torneo asociado y miembros.
- Los grupos tienen roles definidos: Programador, Matematico e Ingles y Comprension.
- Cada rol puede tener un usuario asignado que se busca por correo electronico.
- Los grupos se pueden editar para cambiar miembros o asociaciones de torneos.
- Se pueden eliminar grupos existentes con confirmacion del administrador.
- Los datos de los grupos se sincronizan con la informacion de equipos registrados en el torneo.
- La interfaz muestra iconos de usuario y colores diferenciados para cada rol.


## Funcionalidad de Retos Diarios (DailyChallengesPage)
**Responsable:** Andrey Castilla Contreras

La pagina de Retos Diarios permite a los administradores crear y gestionar desafios de programacion con diferentes niveles de dificultad.

Asi funciona:
- Se pueden crear retos con titulo, descripcion, nivel de dificultad (Basico, Intermedio, Avanzado) y etiquetas.
- Cada reto tiene un estado: Activo, Borrador o Archivado.
- Los retos tienen fecha de publicacion que se registra en Firestore con timestamp del servidor.
- Se pueden editar los retos existentes para actualizar su contenido o estado.
- Se pueden archivar o eliminar retos existentes.
- Los retos archivados permanecen en la base de datos pero no se muestran como activos.
- La pagina incluye navegacion completa hacia otros modulos del sistema.


## Funcionalidad de Torneos (TournamentsPage)
**Responsable:** Andres Felipe Salas Nino

La pagina de Torneos permite a los administradores organizar competencias entre estudiantes con estructura completa de registro.

Asi funciona:
- Se pueden crear torneos con titulo, descripcion, reglas, ubicacion y fechas.
- Cada torneo tiene un numero maximo de equipos permitidos.
- El estado del torneo puede ser: Borrador, Activo, Completado o Cancelado.
- Se especifica la fecha limite de registro de equipos, fecha de inicio y fecha de finalizacion.
- Los torneos en estado borrador pueden editarse sin restricciones.
- Los torneos activos se pueden editar pero tienen mas restricciones.
- Se puede cambiar el estado del torneo segun su evolucion.
- Los torneos completados o cancelados no permiten modificaciones.
- El sistema gestiona automaticamente la lista de equipos registrados.


## Funcionalidad de Inicio (HomePage)
**Responsable:** Javier Andres Quintero Clavijo

La pagina de Inicio es la interfaz principal de bienvenida a la plataforma CodeComp.

Asi funciona:
- Muestra un diseno moderno y atractivo con degradados y animaciones.
- Incluye seccion de FAQ (Preguntas Frecuentes) con respuestas expandibles.
- Contiene navegacion hacia paginas de login y registro para nuevos usuarios.
- El diseno es responsive y se adapta a diferentes tamaños de pantalla.


## Generador de PDF - Reporte de Historial (UserHistoryPage)
**Responsable:** Andres Felipe Salas Nino

La funcionalidad de generador de PDF permite descargar reportes completos del historial de sesiones en formato PDF.

Utilizando las librerias:
- jsPDF: para crear documentos PDF.
- jspdf-autotable: para generar tablas automáticas en PDF.

El reporte PDF incluye:
- Encabezado profesional con logo de CodeComp y fecha de generacion.
- Resumen ejecutivo con tarjetas que muestran:
  - Numero total de registros
  - Cantidad de sesiones activas
  - Cantidad de sesiones finalizadas
  - Numero de metodos de autenticacion utilizados
- Detalles de filtros aplicados (estado, metodo, busqueda).
- Tabla completa con columnas:
  - Numero de fila
  - Nombre y apellido del usuario
  - Correo electronico
  - Codigo de estudiante
  - Metodo de autenticacion utilizado
  - Estado de la sesion
  - Fecha y hora de entrada
  - Fecha y hora de salida
  - Duracion total en formato legible o "En curso" para sesiones activas
- Numeracion de paginas al pie
- Nombres de archivo con fecha de generacion (YYYY-MM-DD)

El usuario puede descargar el reporte filtrado segun:
- Estado de la sesion (Activo/Finalizado)
- Metodo de autenticacion (Email/Password, Google, GitHub, Facebook)
- Busqueda por nombre, correo o codigo de estudiante


## Estructura del proyecto
La estructura principal del repositorio es la siguiente:

```text
hooks_exercise/
|-- public/
|-- src/
|   |-- assets/
|   |-- firebase/
|   |   `-- firebaseConfig.js
|   |-- loginProject/
|   |   |-- CompleteProfilePage.jsx
|   |   |-- DailyChallengesPage.jsx
|   |   |-- DashboardPage.jsx
|   |   |-- GruposPage.jsx
|   |   |-- gruposService.js
|   |   |-- HomePage.jsx
|   |   |-- LoginPage.jsx
|   |   |-- RecoverPage.jsx
|   |   |-- RegisterPage.jsx
|   |   |-- ResetPage.jsx
|   |   |-- TournamentsPage.jsx
|   |   |-- UserHistoryPage.jsx
|   |   |-- registerService.js
|   |   |-- README_Login_EmailPassword.md
|   |   |-- README_Login_Facebook.md
|   |   |-- README_Login_Github.md
|   |   |-- README_Login_Google.md
|   |-- playground/
|   |   |-- HomeHooks.jsx
|   |   |-- UseActionStateExample.jsx
|   |   |-- UseCallbackExample.jsx
|   |   |-- UseContextExample.jsx
|   |   |-- UseDebugValueExample.jsx
|   |   |-- UseDeferredValueExample.jsx
|   |   |-- UseEffectEventExample.jsx
|   |   |-- UseEffectExample.jsx
|   |   |-- UseIdExample.jsx
|   |   |-- UseImperativeHandleExample.jsx
|   |   |-- UseInsertionEffectExample.jsx
|   |   |-- UseLayoutEffectExample.jsx
|   |   |-- UseMemoExample.jsx
|   |   |-- UseOptimisticExample.jsx
|   |   |-- UseReducerExample.jsx
|   |   |-- UseRefExample.jsx
|   |   |-- UseStateExample.jsx
|   |   |-- UseSyncExternalStoreExample.jsx
|   |   |-- UseTransitionExample.jsx
|   |   |-- README_HOOKS.md
|   |   `-- todoStore.js
|   |-- App.css
|   |-- App.jsx
|   |-- config.js
|   |-- index.css
|   `-- main.jsx
|-- index.html
|-- eslint.config.js
|-- postcss.config.js
|-- tailwind.config.js
|-- vite.config.js
|-- package.json
`-- README.md
```


## Instrucciones para ejecucion local
1. Clonar o descargar este repositorio.
2. Instalar dependencias:

```bash
npm install
```

3. Configurar las variables de entorno de Firebase. Crear un archivo `.env` en la raiz del proyecto con las claves del proyecto de Firebase:

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

4. Iniciar el servidor de desarrollo:

```bash
npm run dev
```

5. Abrir en el navegador la URL que entrega Vite, normalmente http://localhost:5173
