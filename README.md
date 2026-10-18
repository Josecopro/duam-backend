# DUAM — Backend

Tecnología: **por definir** (se elige al iniciar la Fase 4, ver `docs/PLAN.md`).

## Responsabilidades previstas

- Base de datos para universidades, carreras (áreas + subdivisiones) y becas, con seed inicial desde `frontend/src/data/*.json`.
- PQRS real: guardar solicitudes del formulario de ayuda y notificar por correo.
- Usuarios con autenticación; favoritos y comparación persistidos por usuario.
- Panel admin (CRUD) protegido por rol.

## Entidades

| Entidad | Campos base (según los datos actuales) |
|---|---|
| University | name, url, type (`private` / `public`), logo |
| CareerCategory | id, name, icon, image, description |
| CareerSubcategory | name, categoryId |
| Scholarship | id, title, description, videoUrl, type, institution |
| PqrsTicket | name, email, type, message, status, createdAt |
| User | email, name, role (`user` / `admin`) |
| Favorite / Comparison | userId, itemType, itemId |

## Contrato esperado por el frontend

API REST JSON. El frontend solo consume datos a través de `frontend/src/lib/data.ts`, así que conectar el backend es cambiar ese archivo.
