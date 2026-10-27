# Endpoints de la API

Base URL: `http://localhost:3000/api`

## Convenciones

- **Autenticación:** `Authorization: Bearer <accessToken>` (dura 15 min). El refresh token viaja en cookie httpOnly (7 días); el cliente HTTP debe enviar credenciales (`withCredentials`).
- **Paginación:** `?page=1&limit=20` (limit máx. 100). Respuesta: `{ "data": [...], "pagination": { "page", "limit", "total", "totalPages" } }`.
- **IDs:** UUID. Fechas en ISO 8601.
- **Errores:** siempre `{ "error": { "code", "message", "details?" } }`.

| HTTP | code                | Cuándo |
|------|---------------------|--------|
| 400  | `VALIDATION_ERROR`  | Body, query o params inválidos (`details` = errores por campo) |
| 401  | `UNAUTHORIZED`      | Sin token, token inválido/expirado o credenciales erróneas |
| 403  | `FORBIDDEN`         | Rol o propiedad insuficiente |
| 404  | `NOT_FOUND`         | Recurso inexistente |
| 409  | `CONFLICT` / `INVALID_TRANSITION` | Correo duplicado, rol propio, job no fallido, transición de estado inválida |
| 429  | `RATE_LIMITED`      | Más de 20 peticiones a `/auth` en 15 min |
| 500  | `INTERNAL`          | Error inesperado |

Ejemplo de error de validación:

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Datos inválidos", "details": { "title": ["Too small: expected string to have >=3 characters"] } } }
```

Ejemplos de objetos usados abajo:

```json
// User (público)
{ "id": "…", "name": "Cliente Uno", "email": "client1@helpdesk.local", "role": "CLIENT" }

// Ticket
{
  "id": "5b0c…", "title": "No funciona la VPN", "description": "Error al conectar",
  "priority": "HIGH", "status": "OPEN", "createdById": "…", "assignedToId": null,
  "createdAt": "2026-10-22T15:00:00.000Z", "updatedAt": "2026-10-22T15:00:00.000Z",
  "createdBy": { "id": "…", "name": "Cliente Uno", "email": "client1@helpdesk.local" },
  "assignedTo": null
}

// JobLog
{
  "id": "…", "queue": "ticket-assignment", "jobId": "…", "name": "assign", "ticketId": "5b0c…",
  "status": "COMPLETED", "attempts": 1, "error": null, "payload": { "ticketId": "5b0c…" },
  "createdAt": "…", "updatedAt": "…", "finishedAt": "…"
}
```

## Sistema

| Método | Ruta      | Rol     | Parámetros | Respuesta |
|--------|-----------|---------|------------|-----------|
| GET    | `/health` | Público | —          | `200 { "status": "ok" }` |

## Autenticación (`/auth`, con rate limit)

| Método | Ruta             | Rol         | Parámetros (body) | Respuesta |
|--------|------------------|-------------|-------------------|-----------|
| POST   | `/auth/register` | Público     | `name` (2–100), `email`, `password` (8–72) | `201 { "user": User }` — siempre rol CLIENT. 409 si el correo existe |
| POST   | `/auth/login`    | Público     | `email`, `password` | `200 { "accessToken": "eyJ…", "user": User }` + cookie `refresh` httpOnly. 401 si credenciales inválidas |
| POST   | `/auth/refresh`  | Cookie refresh | — | `200 { "accessToken": "eyJ…", "user": User }` y rota la cookie. 401 si falta, expiró o fue revocado |
| POST   | `/auth/logout`   | Cookie refresh (opcional) | — | `204` sin cuerpo; revoca el token y borra la cookie |
| GET    | `/auth/me`       | Autenticado | —                 | `200 { "user": User }` |

```json
// POST /auth/login
// Request
{ "email": "admin@helpdesk.local", "password": "Password123!" }
// Response 200
{ "accessToken": "eyJhbGciOi…", "user": { "id": "…", "name": "Admin", "email": "admin@helpdesk.local", "role": "ADMIN" } }
```

## Tickets (`/tickets`)

Visibilidad: CLIENT ve los que creó, TECH los asignados a él, ADMIN todos.

| Método | Ruta                  | Rol | Parámetros | Respuesta |
|--------|-----------------------|-----|------------|-----------|
| GET    | `/tickets`            | Autenticado (filtrado por rol) | query: `status?`, `priority?`, `page?`, `limit?` | `200 { "data": [Ticket], "pagination": {…} }` ordenado por fecha desc |
| POST   | `/tickets`            | CLIENT, ADMIN | body: `title` (3–150), `description` (5–5000), `priority?` (`LOW\|MEDIUM\|HIGH\|URGENT`, def. `MEDIUM`) | `201 { "ticket": Ticket }`; encola asignación y correo |
| GET    | `/tickets/:id`        | Creador, asignado o ADMIN | params: `id` | `200 { "ticket": Ticket }` |
| GET    | `/tickets/:id/jobs`   | Creador, asignado o ADMIN | params: `id` | `200 { "jobs": [JobLog] }` ordenado por creación asc |
| PATCH  | `/tickets/:id`        | ADMIN, o creador si el ticket está `OPEN` | body (≥1 campo): `title?`, `description?`, `priority?` | `200 { "ticket": Ticket }` |
| DELETE | `/tickets/:id`        | ADMIN, o creador si el ticket está `OPEN` | params: `id` | `204` sin cuerpo |
| PATCH  | `/tickets/:id/status` | TECH asignado o ADMIN | body: `status` (`OPEN\|IN_PROGRESS\|RESOLVED\|CLOSED`) | `200 { "ticket": Ticket }`; encola correo. 409 `INVALID_TRANSITION` si no es válida |

Transiciones permitidas: `OPEN → IN_PROGRESS → RESOLVED → CLOSED` (y `RESOLVED → IN_PROGRESS`); `CLOSED` es final.

```json
// POST /tickets
// Request
{ "title": "No funciona la VPN", "description": "Error al conectar", "priority": "HIGH" }
// Response 201
{ "ticket": { "id": "5b0c…", "title": "No funciona la VPN", "priority": "HIGH", "status": "OPEN", "assignedTo": null, "…": "…" } }

// PATCH /tickets/:id/status
// Request
{ "status": "IN_PROGRESS" }
// Error 409
{ "error": { "code": "INVALID_TRANSITION", "message": "No se puede pasar de OPEN a RESOLVED" } }
```

## Usuarios (`/users`) — solo ADMIN

| Método | Ruta              | Rol   | Parámetros | Respuesta |
|--------|-------------------|-------|------------|-----------|
| GET    | `/users`          | ADMIN | query: `role?` (`CLIENT\|TECH\|ADMIN`) | `200 { "users": [{ id, name, email, role, isActive }] }` ordenado por nombre |
| PATCH  | `/users/:id/role` | ADMIN | body: `role` | `200 { "user": { id, name, email, role, isActive } }`. 409 si `:id` es el propio usuario; 404 si no existe |

## Jobs (`/jobs`)

`:queue` es `ticket-assignment` o `notifications`.

| Método | Ruta                      | Rol | Parámetros | Respuesta |
|--------|---------------------------|-----|------------|-----------|
| GET    | `/jobs`                   | ADMIN | query: `queue?`, `status?` (`WAITING\|ACTIVE\|RETRYING\|COMPLETED\|FAILED`), `page?`, `limit?` | `200 { "data": [JobLog], "pagination": {…} }` |
| GET    | `/jobs/:queue/:id`        | Mismo acceso que el ticket del job (sin ticket: solo ADMIN) | params: `queue`, `id` (jobId) | `200 { "job": JobLog + "bullmq" }` |
| POST   | `/jobs/:queue/:id/retry`  | ADMIN | params: `queue`, `id` | `200 { "job": { "queue", "jobId", "state": "waiting" } }`. 409 si el job no está fallido; 404 si ya no está en Redis |

```json
// GET /jobs/ticket-assignment/42
{
  "job": {
    "id": "…", "queue": "ticket-assignment", "jobId": "42", "name": "assign", "ticketId": "5b0c…",
    "status": "RETRYING", "attempts": 2, "error": "Fallo simulado", "…": "…",
    "bullmq": { "state": "delayed", "attemptsMade": 2, "maxAttempts": 3, "failedReason": "Fallo simulado" }
  }
}
// bullmq es null si el job ya salió de Redis (removeOnComplete)

// POST /jobs/notifications/17/retry
{ "job": { "queue": "notifications", "jobId": "17", "state": "waiting" } }
```

## Panel de colas (admin)

| Método | Ruta                        | Rol   | Parámetros | Respuesta |
|--------|-----------------------------|-------|------------|-----------|
| POST   | `/admin/queues/session`     | ADMIN | —          | `200 { "url": "/admin/queues" }` + cookie válida 1 h |
| GET    | `/admin/queues` (fuera de `/api`) | ADMIN con la cookie anterior | — | UI de bull-board en `http://localhost:3000/admin/queues`. 401 sin cookie |
