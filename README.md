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

## Deploy

```bash
npm run build
firebase deploy --only hosting
```

## Autor

Javier Quintero — [jaquinterocl@ufpso.edu.co](mailto:jaquinterocl@ufpso.edu.co)
