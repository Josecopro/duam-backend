# DUAM — Backend (API REST)

DUAM reúne en un solo lugar la oferta de educación superior del Área Metropolitana del Valle de Aburrá (Antioquia): universidades privadas y oficiales, carreras por área de estudio y opciones de financiación. Este repositorio es la **API REST**: Node.js + Express 5 + TypeScript + **Prisma 7** + PostgreSQL (Neon en producción), en 4 capas, con autenticación JWT.

| | URL |
|---|---|
| API (Render) | **https://duam-api.onrender.com/api** (p. ej. [`/api/universidades`](https://duam-api.onrender.com/api/universidades)) |
| Frontend (Vercel) | **https://desarrollo-web-seven-tau.vercel.app** |
| Repositorio del frontend | https://github.com/Josecopro/DesarrolloWeb (guarda frontend y backend, pero funciona como el repositorio del frontend) |

> Plan gratuito de Render: si la API lleva ~15 min sin tráfico se suspende y la primera petición tarda unos 50 s en despertarla.

## Correr en local

Requisitos: Node.js ≥ 20 y PostgreSQL (o podman/docker).

```bash
podman run -d --name duam-pg -e POSTGRES_USER=duam -e POSTGRES_PASSWORD=duam -e POSTGRES_DB=duam -p 5433:5432 postgres:17-alpine
cp .env.example .env        # pon un JWT_SECRET propio (≥ 32 caracteres)
npm install                 # postinstall: prisma generate
npm run db:migrate          # migraciones (prisma/migrations)
npm run db:seed             # datos de la Entrega 1 + usuarios de prueba (idempotente)
npm run dev                 # http://localhost:4000/api
npm test                    # 23 pruebas de la API contra la base de DATABASE_URL
```

| Script | Qué hace |
|---|---|
| `dev` / `start` | Servidor (`src/server.ts`); `start` es el que usa Render |
| `db:migrate` | `prisma migrate dev` (crea/aplica migraciones en desarrollo) |
| `db:deploy` | `prisma migrate deploy` (producción; Render lo corre en cada build) |
| `db:seed` | `prisma db seed` → `prisma/seed.ts` |
| `test` | Pruebas `node:test` (`test/api.test.ts`) |
| `typecheck` | `tsc --noEmit` |

### Variables de entorno (`.env.example`)

| Variable | Para qué |
|---|---|
| `DATABASE_URL` | Conexión a PostgreSQL (en Neon, la *pooled*) |
| `DATABASE_URL_UNPOOLED` | (Opcional) conexión directa para migraciones y seed en Neon |
| `JWT_SECRET` | Clave para firmar los JWT (mínimo 32 caracteres; sin ella la API no arranca) |
| `JWT_EXPIRES_IN` | Duración del token (`2h`) |
| `CORS_ORIGINS` | URL(s) del frontend permitidas por CORS, separadas por coma (nunca `*`) |
| `PORT` | Puerto (local 4000; Render lo define solo) |

El `.env` real está en `.gitignore`; en producción las variables viven en Render.

## Credenciales de prueba

Creadas por `npm run db:seed`. **Solo para el ambiente de la entrega.** Se pueden cambiar con `SEED_ADMIN_PASSWORD` / `SEED_USER_PASSWORD` al correr el seed.

| Rol | Correo | Contraseña |
|---|---|---|
| admin | `admin@duam.co` | `AdminDuam2026!` |
| user | `usuario@duam.co` | `UsuarioDuam2026!` |

## Arquitectura

```
src/
├── domain/           entidades, contratos de repositorio y errores con su código HTTP (sin dependencias)
├── application/      casos de uso (auth, catálogos, solicitudes) y puertos (PasswordHasher, TokenService)
├── infrastructure/   Prisma (cliente, repositorios, traducción de errores P2002/P2003/P2025),
│                     bcrypt, JWT, configuración (env.ts) y composición (container.ts)
├── interface/http/   app Express: routers (permisos), controladores, middlewares (authenticate, soloAdmin,
│                     errores) y esquemas zod
├── app.ts            arma la app Express
└── server.ts         punto de entrada (app.listen)
prisma/               schema.prisma, migrations/, seed.ts, seed-data/ (datos de la Entrega 1)
render.yaml           Blueprint de Render (build, start, health check y variables)
```

## Modelo de datos

- `users`: name, email (único), password (hash bcrypt), role (`admin` | `user`).
- `universities` (catálogo 1): name (único), url, type (`private` | `public`).
- `careers` (catálogo 2): id (slug), name, icon, image, description, summary, tone, symbol, programs[].
- `scholarships`: solo lectura.
- `pqrs_requests` (interacción): type, message, status, **user_id → users** (cascade) y **university_id → universities** (restrict).

## Endpoints

| Método | Ruta | Acceso | Respuesta |
|---|---|---|---|
| POST | `/api/auth/register` | Público | 201 `{ token, user }` · 400 · **409** email repetido |
| POST | `/api/auth/login` | Público | 200 `{ token, user }` · **401** genérico |
| GET | `/api/auth/me` | Autenticado | `{ user }` |
| GET | `/api/universidades?page&limit&type&q` | Público | `{ pagination, data }` |
| GET | `/api/universidades/:id` | Público | universidad · 404 |
| POST · PUT · DELETE | `/api/universidades[/:id]` | **Solo admin** | 201 / 200 / 204 · 409 nombre repetido o con solicitudes |
| GET | `/api/carreras?page&limit` | Público | `{ pagination, data }` |
| GET | `/api/carreras/:id` | Público | área · 404 |
| POST · PUT · DELETE | `/api/carreras[/:id]` | **Solo admin** | 201 / 200 / 204 |
| GET | `/api/becas` | Público | `{ pagination, data }` |
| POST | `/api/solicitudes` | Autenticado (a nombre del token) | 201 |
| GET | `/api/solicitudes/mias` | Autenticado: solo las suyas | `{ pagination, data }` |
| GET | `/api/solicitudes?status` | **Solo admin**: todas | `{ pagination, data }` |
| PATCH | `/api/solicitudes/:id` | **Solo admin** | solicitud con nuevo estado |
| GET | `/api/health` | Público | `{ ok: true }` |

Errores siempre como `{ error, details? }` (`details` = errores por campo), sin stack trace. Sin token o token inválido/expirado → **401**; token válido sin rol → **403**. CORS solo para `CORS_ORIGINS`.

## Decisiones técnicas

### Flujo completo de un login

1. **Formulario** (`DesarrolloWeb/frontend/src/features/auth/components/LoginForm.tsx`): valida en el cliente que el correo tenga formato válido y que la contraseña no esté vacía. Si hay errores, se muestran debajo de cada campo y no se envía nada.
2. **Hook y servicio**: `useAuth().login()` llama a `authService.login()` (`features/auth/services/auth.service.ts`), que usa el cliente HTTP único `features/common/http.ts` para hacer `POST https://duam-api.onrender.com/api/auth/login` con `{ email, password }`.
3. **API**: el router (`src/interface/http/routes/index.ts`) pasa la petición al controlador, que valida el body con zod (400 si es inválido) y llama al caso de uso `login` (`src/application/auth.ts`). Este busca el usuario por email con Prisma y compara la contraseña con el hash usando **bcrypt**. Si el email no existe, igual compara contra un hash de relleno, para que el tiempo de respuesta no delate qué cuentas existen. Si algo falla, responde **401 "Correo o contraseña incorrectos"**, el mismo mensaje en ambos casos.
4. **Token**: si las credenciales son válidas, `jwtTokenService.sign()` firma un JWT HS256 con `JWT_SECRET` y `expiresIn = JWT_EXPIRES_IN` (2h). El payload solo lleva `{ id, role }`. La respuesta es `{ token, user }`, donde `user` nunca incluye la contraseña.
5. **Sesión en el navegador**: `sessionStore.set()` guarda `{ token, user }` en `localStorage`. La barra de navegación se actualiza (nombre, "Salir", "Administración" si es admin) y el usuario vuelve a la página de `?next=`.
6. **Ruta protegida**: al abrir `/mis-solicitudes`, `RequireAuth` deja pasar porque hay sesión, y `useMyRequests()` llama a `requestsService.mine()`. `http.ts` agrega `Authorization: Bearer <token>`.
7. **En la API**, el router de `/api/solicitudes` aplica `authenticate`: lee el header, verifica firma y expiración con `JWT_SECRET` y deja `req.user = { id, role }`. El controlador lista solo las solicitudes con `userId = req.user.id` (nunca un id que venga del cliente) y responde `{ pagination, data }`.

![Pestaña Network: GET /api/solicitudes/mias con el header Authorization: Bearer …](docs/img/network-authorization.png)

*Captura de la pestaña Network de Chromium en producción: la petición protegida lleva `Authorization: Bearer <jwt>` (token de la cuenta de prueba, ya vencido).*

### ¿Dónde se guarda el token y qué riesgo tiene?

En **`localStorage`** (clave `duam-session`, junto al usuario público). Se eligió porque es simple, sobrevive al recargar y permite que `http.ts` agregue el header `Authorization` a cualquier petición hacia una API en otro dominio.

**Riesgo:** cualquier JavaScript que logre ejecutarse en la página, por ejemplo por XSS o por una dependencia comprometida, puede leer el token y usarlo hasta que expire. Lo mitigamos así:

- React escapa el contenido y no se usa `dangerouslySetInnerHTML` con datos de usuario (el único uso es el script fijo del tema).
- El token dura solo **2 horas**.
- El payload no lleva datos sensibles.
- El frontend descarta al cargar un token cuyo `exp` ya pasó.
- Ante cualquier 401, `http.ts` borra la sesión.

La alternativa más segura sería una cookie `HttpOnly; Secure; SameSite`, que JavaScript no puede leer. Con dos dominios distintos (frontend y API) eso exige configurar cookies entre sitios y protección CSRF, y queda como mejora.

### ¿Cuándo responde la API 401 y cuándo 403?

- **401 Unauthorized: no sabemos quién eres o tu identidad no es válida.** Pasa cuando no hay token, el header no es `Bearer`, la firma no coincide o el token expiró. También en un login con credenciales incorrectas. Ejemplo real: `GET /api/solicitudes/mias` sin header devuelve `401 {"error":"Se requiere iniciar sesión"}`, y con un token vencido `401 {"error":"Sesión inválida o expirada"}`. En el frontend, un 401 en una petición que llevaba token cierra la sesión y redirige a `/login`.
- **403 Forbidden: sabemos quién eres, pero no tienes permiso.** El token es válido pero el rol no alcanza (middleware `soloAdmin`). Ejemplo real: con la sesión de `usuario@duam.co`, `GET /api/solicitudes` (listar todas) o `POST /api/universidades` devuelven `403 {"error":"No tienes permiso para realizar esta acción"}`. En el frontend, si ese usuario escribe `/admin` en la URL, se le redirige al inicio; y aunque se saltara esa redirección, la API seguiría respondiendo 403.

### Uso de IA (borrador para que lo completen los autores)

Se usó un asistente de IA (Claude Code) como pareja de programación para:

- reescribir el backend con Prisma y la arquitectura de 4 capas;
- implementar la autenticación JWT;
- escribir las pruebas automáticas y desplegar (primero en Vercel, luego en Render).

Correcciones hechas durante el proceso (a revisar y completar por el equipo):

- **Decisiones que el equipo cambió:** al principio se mantuvo un monorepo con la API en Vercel; después se separó en dos repositorios y la API se movió a Render, como pide la guía. Se definieron como catálogos universidades **y** carreras.
- **Errores detectados con pruebas y corregidos:** la búsqueda no encontraba "Medellín" al escribir "medellin" (búsqueda sin tildes).

*(Agreguen aquí, en sus palabras, para qué usaron la IA ustedes y qué tuvieron que corregir o decidir.)*

## Despliegue (Render)

`render.yaml` define el servicio web `duam-api` (plan gratuito, Node 22):

- **Build:** `npm ci && npm run db:deploy` (instala, genera el cliente de Prisma y aplica migraciones pendientes).
- **Start:** `npm start`. **Health check:** `/api/health`.
- **Variables en Render:** `DATABASE_URL` y `DATABASE_URL_UNPOOLED` (Neon), `JWT_SECRET` (generado por Render), `JWT_EXPIRES_IN`, `CORS_ORIGINS` (URL del frontend en Vercel).
- **Auto-deploy:** conectado a GitHub; un push a `main` redespliega.

Seed de producción (una sola vez, con la URL directa de Neon):

```bash
DATABASE_URL_UNPOOLED=<url> npm run db:seed
```
