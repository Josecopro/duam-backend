# DUAM — Backend (API REST)

Node.js + Express 5 + TypeScript + **Prisma 7** + PostgreSQL (Neon en producción). Arquitectura en 4 capas. Autenticación con JWT.

- API en producción: **https://duam-api.vercel.app/api**
- Frontend en producción: **https://desarrollo-web-seven-tau.vercel.app**
- Visión general, decisiones técnicas (login, token, 401 vs 403) y credenciales: [README raíz](../README.md).

## Correr en local

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
| `dev` / `start` | Servidor local (`src/server.ts`) |
| `db:migrate` | `prisma migrate dev` (crea/aplica migraciones en desarrollo) |
| `db:deploy` | `prisma migrate deploy` (producción) |
| `db:seed` | `prisma db seed` → `prisma/seed.ts` |
| `test` | Pruebas `node:test` (`test/api.test.ts`) |
| `typecheck` | `tsc --noEmit` |

### Variables de entorno (`.env.example`)

`DATABASE_URL`, `DATABASE_URL_UNPOOLED` (opcional), `JWT_SECRET`, `JWT_EXPIRES_IN`, `CORS_ORIGINS`, `PORT`. El `.env` real no se sube.

### Credenciales de prueba (seed)

`admin@duam.co` / `AdminDuam2026!` (admin) · `usuario@duam.co` / `UsuarioDuam2026!` (user). Solo para el ambiente de la entrega; se pueden cambiar con `SEED_ADMIN_PASSWORD` / `SEED_USER_PASSWORD` al correr el seed.

## Arquitectura

```
src/
├── domain/           entidades, contratos de repositorio y errores con su código HTTP (sin dependencias)
├── application/      casos de uso (auth, catálogos, solicitudes) y puertos (PasswordHasher, TokenService)
├── infrastructure/   Prisma (cliente, repositorios, traducción de errores P2002/P2003/P2025),
│                     bcrypt, JWT, configuración (env.ts) y composición (container.ts)
├── interface/http/   app Express: routers (permisos), controladores, middlewares (authenticate, soloAdmin,
│                     errores) y esquemas zod
├── app.ts            entrada para Vercel (export default de la app)
└── server.ts         servidor local
prisma/               schema.prisma, migrations/, seed.ts, seed-data/ (datos de la Entrega 1)
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

## Despliegue (Vercel, proyecto `duam-api`)

Root Directory `backend`, preset Express (detecta `src/app.ts`). Base de datos Neon instalada desde el Marketplace de Vercel. Migraciones y seed en producción, con la URL directa de Neon:

```bash
DATABASE_URL_UNPOOLED=<url> npm run db:deploy
DATABASE_URL_UNPOOLED=<url> npm run db:seed
```
