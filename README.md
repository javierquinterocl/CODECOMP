# CODECOMP

Plataforma de programación competitiva del grupo de maratón de Ingeniería de Sistemas de la Universidad Francisco de Paula Santander Ocaña. Incluye catálogo de problemas, juez en línea, nivel adaptativo, tutor con IA, el módulo Fundamentos en PSeInt, vista docente, competencias y notificaciones.

Autores: Andrés Salas y Javier Quintero. Derechos reservados: lee `LICENSE` y `AVISO.md` antes de usar el código.

## Componentes

| Parte | Tecnología |
|---|---|
| Frontend | React 19, Vite, React Router 7 (JavaScript) |
| Sesión y perfiles | Firebase Authentication y Firestore |
| API | Una Supabase Edge Function (Deno, TypeScript): `supabase/functions/api` |
| Base de datos | PostgreSQL de Supabase; migraciones en `database/` |
| Juez de Problemas | Judge0 CE por RapidAPI |
| Juez de PSeInt | AWS Lambda (`aws/pseint/`) |
| Tutor | API compatible con OpenAI (DeepInfra) |
| Correo | Resend |
| Dominio y proxy de la API | Worker de Cloudflare (`cloudflare/api-proxy/`) |
| Competencias | DOMjudge |

## Estructura

```
src/pages/        una página por ruta (las rutas están en src/App.jsx)
src/components/   piezas que usan varias páginas
src/scripts/      lógica sin JSX: clientes de la API, datos, hooks
src/css/          una hoja de estilos por área
supabase/functions/api/index.ts      entrada única de la API
supabase/functions/_compartido/      lógica del backend; rutas/ tiene un archivo por endpoint
supabase/tests/   pruebas de Deno
database/         migraciones SQL numeradas
scripts/          importador del catálogo y utilidades
functions/        backend anterior en Firebase Functions (ya no se usa; se conserva como referencia)
```

## Qué no viene en este código

Ninguna llave ni contraseña. Las credenciales de Judge0, DeepInfra, AWS, Resend, Supabase y la cuenta de servicio de Firebase se configuran como variables de entorno o secretos de Supabase y nunca se versionan. Tampoco vienen los datos de la base: catálogo cargado, casos de prueba ocultos, soluciones de referencia ni traducciones.

Para ejecutar la plataforma necesitas tus propias cuentas y llaves. El código no da acceso a los servicios ni a los datos del despliegue original.

## Requisitos

- Node.js 20 o superior y npm
- Deno 2
- Supabase CLI
- Un proyecto de Firebase con Authentication (correo y Google) y Firestore
- Un proyecto de Supabase
- Una llave de RapidAPI para Judge0 CE
- Opcional: una llave de DeepInfra (tutor), una cuenta de AWS (PSeInt), Resend (correo) y DOMjudge (competencias)

## Puesta en marcha local

1. Instala las dependencias:

   ```bash
   npm install
   ```

2. Crea la base: aplica las migraciones de `database/` en orden numérico (o `database/esquema_completo.sql`, que las reúne) en tu proyecto de Supabase.

3. Configura la API: copia `.env.example` a `supabase/.env` y llena como mínimo `DATABASE_URL`, `FIREBASE_PROJECT_ID`, `RAPIDAPI_KEY` y `ALLOWED_ORIGINS`. Las demás variables activan módulos opcionales; cada una está explicada en el archivo.

4. Levanta la API:

   ```bash
   npx supabase functions serve api --env-file supabase/.env
   ```

5. Configura el frontend: copia `.env.example` a `.env` y llena las variables `VITE_FIREBASE_*` con la configuración web de tu proyecto de Firebase. Con `VITE_ENABLE_ADAPTIVE=true` el envío usa todos los casos de prueba y guarda el nivel.

6. Levanta el frontend:

   ```bash
   npm run dev
   ```

   Vite sirve en `http://localhost:5173` y reenvía `/api/*` a la función local.

7. Carga el catálogo de problemas con el importador:

   ```bash
   python -m pip install -r requirements-import.txt
   python scripts/import_problems.py
   ```

   Usa las variables `PGHOST`, `PGDATABASE`, `PGUSER` y `PGPASSWORD` de tu base. Después vuelve a aplicar `database/010_saneamiento_catalogo.sql`.

8. Define los administradores: cambia `ADMIN_EMAILS` en `src/scripts/config.js` y los correos de `firestore.rules` por los de tu equipo, y publica las reglas en tu proyecto de Firebase.

## Pruebas y revisión

```bash
deno test --allow-env --allow-read=supabase/functions supabase/tests/
deno check "supabase/functions/**/*.ts"
npm run lint
npm run build
```

`supabase/tests/integracion_test.ts` solo corre si defines `DESTINO_DATABASE_URL` con una base de prueba.

## Despliegue

- Frontend: `npm run build` y `firebase deploy --only hosting --project <tu-proyecto>`.
- API: `npx supabase functions deploy api --project-ref <tu-ref> --no-verify-jwt`, con las variables de `.env.example` como secretos del proyecto. Se despliega sin verificación de JWT de Supabase porque la sesión es de Firebase.
- Juez de PSeInt: `aws/pseint/desplegar.sh` con tu propia cuenta de AWS.
- Proxy y tareas programadas: `cloudflare/api-proxy/` con Wrangler, en tu propio dominio.

## Licencia y firma

El código es propiedad de sus autores (ver `LICENSE`). Cada entrega va firmada: `AVISO.md` explica cómo comprobar que los archivos no fueron modificados.

Contacto: afsalasn@ufpso.edu.co
