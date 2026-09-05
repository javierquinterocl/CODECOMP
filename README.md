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

Las rutas `/api/problems`, `/api/progress` y `/api/recommendations` las sirven
las Functions locales, así que para probarlas abre otra terminal y ejecuta:

```powershell
@'
DATABASE_URL=postgresql://usuario:password@host:5432/codecomp?sslmode=require
'@ | Set-Content functions/.secret.local
npm run dev:functions
```

Reemplaza la URL de ejemplo por la conexión real de PostgreSQL. La primera
terminal mantiene `npm run dev` y la segunda mantiene el emulador en el puerto
`5001`. Antes de cargar problemas, aplica las migraciones de `database/` y
ejecuta el importador si la tabla `problems` todavía está vacía.

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

### PostgreSQL adaptativo

El esquema ejecutable está en `database/001_adaptive_platform.sql`. Aplica las
migraciones en orden:

```bash
psql "$DATABASE_URL" -f database/001_adaptive_platform.sql
psql "$DATABASE_URL" -f database/002_firebase_catalog_compatibility.sql
psql "$DATABASE_URL" -f database/003_problem_import_compatibility.sql
psql "$DATABASE_URL" -f database/004_codeforces_rating_range.sql
```

Para llenar `problems`, `tags`, `problem_tags` y `test_cases` desde el dataset
`DenCT/codeforces-problems-7k`,
instala las dependencias del importador y configura las variables de conexión:

```bash
python -m pip install -r requirements-import.txt
$env:PGDATABASE="tu_base_de_datos"
$env:PGUSER="postgres"
$env:PGPASSWORD="tu_password"
python scripts/import_problems.py
```

El importador es idempotente para problemas, etiquetas y casos de prueba, y
confirma la transacción cada 50 problemas.

Los servicios `functions/services/` exponen `saveProblem`,
`getHiddenTestCases`, `processSubmissionResult` y
`getRecommendedProblems`. Configura `DATABASE_URL` en el entorno de Functions
antes de invocarlos; `pg` administra el pool de conexiones.

Para activar el guardado adaptativo en el editor, configura
`VITE_ENABLE_ADAPTIVE=true`. Primero debes importar los problemas actuales en
PostgreSQL y agregar sus `problem_number` y casos de prueba. Con el valor
`false`, el editor conserva la evaluación de ejemplo local mediante Judge0.

En local, `npm run dev` usa automáticamente el proxy de Vite, por lo que no
necesitas desplegar Functions para probar el editor.

## Deploy

```bash
npm run build
firebase deploy --only hosting
```

## Autor

Javier Quintero — [jaquinterocl@ufpso.edu.co](mailto:jaquinterocl@ufpso.edu.co)
