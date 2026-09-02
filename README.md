# CODECOMP

Plataforma de programación competitiva para el grupo de maratón de Ingeniería de Sistemas — **Universidad Francisco de Paula Santander Ocaña**.

## 🌐 Enlace de producción

**https://codecompc.web.app**

## Stack

- React + Vite
- Firebase (Auth, Firestore, Hosting)
- Tailwind CSS
- React Router DOM

## Estructura

```
src/
├── main.jsx              punto de entrada
├── App.jsx               rutas
├── css/                  hojas de estilo (una por área)
├── scripts/              lógica sin JSX: servicios, datos, hooks, config
├── pages/                componentes principales — una página por ruta
├── components/           componentes secundarios — piezas reutilizables
├── context/              estado compartido (AuthContext)
└── assets/               imágenes empaquetadas por Vite
```

Regla para saber dónde va un archivo nuevo: si lo renderiza una ruta, va en
`pages/`; si lo usa más de una página, va en `components/`; si no devuelve
JSX, va en `scripts/`.

## Desarrollo local

```bash
npm install
npm run dev
```

Para habilitar la evaluación de código, copia `.env.example` a `.env` y configura
`RAPIDAPI_KEY` para el proxy local de Vite. El servicio usa Judge0 CE mediante
`/submissions?wait=true` y expone el mapa `JUDGE0_LANGUAGE_IDS` junto con
`evaluarCodigo` desde `src/scripts/judge0Service.js`.

En producción, configura la clave como secreto de Firebase y despliega el proxy:

```bash
firebase functions:secrets:set RAPIDAPI_KEY
npm --prefix functions install
npm run build
firebase deploy --only functions,hosting
```

La ruta `/api/judge0` mantiene la clave de RapidAPI en Functions y nunca la
envía al navegador.

En local, `npm run dev` usa automáticamente el proxy de Vite, por lo que no
necesitas desplegar Functions para probar el editor.

## Deploy

```bash
npm run build
firebase deploy --only hosting
```

## Autor

Javier Quintero — [jaquinterocl@ufpso.edu.co](mailto:jaquinterocl@ufpso.edu.co)
