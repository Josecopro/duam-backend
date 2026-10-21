# DUAM — Backend

API REST en **Node.js + Express 5 + TypeScript**, con **PostgreSQL** (Neon en producción). Se despliega en Vercel como proyecto aparte (Root Directory = `backend`): Vercel detecta `src/app.ts` y lo ejecuta como una función.

## Desarrollo local

```bash
# 1. Postgres local (puerto 5433 para no chocar con uno instalado)
podman run -d --name duam-pg -e POSTGRES_USER=duam -e POSTGRES_PASSWORD=duam -e POSTGRES_DB=duam -p 5433:5432 postgres:17-alpine
#    (o docker run ... con los mismos argumentos)

# 2. Configuración
cp .env.example .env          # y cambia API_KEY

# 3. Esquema + datos iniciales (idempotente, se puede repetir)
npm install
npm run db:setup

# 4. API en http://localhost:4000
npm run dev
```

| Script | Qué hace |
|---|---|
| `npm run dev` | API con recarga automática (`src/server.ts`) |
| `npm run db:setup` | Crea las tablas (`db/schema.sql`) y carga/actualiza `db/seed/*.json`. No toca los PQRS |
| `npm test` | Pruebas de la API contra la base de `DATABASE_URL` (necesita `db:setup` antes) |
| `npm run typecheck` | Verificación de tipos |

## Endpoints

| Método | Ruta | Respuesta |
|---|---|---|
| GET | `/api/health` | `{ ok: true }` si la base responde |
| GET | `/api/universities` | `{ private: [{ name, url }], public: [...] }` |
| GET | `/api/careers` | Áreas con `subcategories` |
| GET | `/api/careers/:id` | Un área, o 404 |
| GET | `/api/scholarships` | Becas |
| POST | `/api/pqrs` | Requiere cabecera `x-api-key`. Body `{ nombre, correo, comentario }` → 201 `{ id }` / 400 `{ errors }` / 401 |

Los GET llevan `Cache-Control: s-maxage=300, stale-while-revalidate` (la CDN de Vercel los cachea).

**Seguridad:** el navegador nunca llama a esta API. El frontend lee los datos desde el servidor de Next y envía los PQRS con una server action que agrega `x-api-key`, así que la API no expone CORS y la clave no llega al cliente. El body JSON está limitado a 10 KB.

## Variables de entorno

| Variable | Uso |
|---|---|
| `DATABASE_URL` | Cadena de Postgres. En Neon usa la conexión **pooled** |
| `API_KEY` | Clave compartida con el frontend para escrituras |
| `PORT` | Solo local (por defecto 4000) |

## Modelo

`universities`, `career_categories` + `career_subcategories`, `scholarships`, `pqrs_tickets` (con `status`: `new` / `in_progress` / `closed`, para gestionarlos desde el panel admin de la Fase 5). Ver `db/schema.sql`.
