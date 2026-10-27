# HelpDesk Galacticos — Sistema de Tickets de Soporte

Sistema de tickets con roles (CLIENT, TECH, ADMIN), autenticación JWT con refresh token rotativo y colas BullMQ
(asignación automática de técnico y notificaciones por correo).

## Estructura del proyecto

```
.
├── docker-compose.yml      # postgres, redis, mailpit
├── backend/                # API Express + workers
│   ├── prisma/             # schema.prisma, migraciones, seed.js
│   ├── src/
│   │   ├── config/         # env, prisma, mailer, bull-board
│   │   ├── routes/ controllers/ services/ validators/ middlewares/
│   │   ├── queues/         # colas y opciones por defecto
│   │   ├── workers/        # proceso separado (npm run worker)
│   │   └── utils/
│   └── test/               # tests con jest + supertest
├── frontend/               # React + Vite
│   └── src/                # api, components, context, lib, pages
└── docs/
    ├── ARQUITECTURA.md
    └── ENDPOINTS.md        # referencia de la API
```

## Requisitos

- Node.js 20+
- Docker y Docker Compose
- Puertos libres: 5432 (Postgres), 6379 (Redis), 1025/8025 (Mailpit), 3000 (API), 5173 (frontend)

## Instalación paso a paso

```bash
# 1. Servicios de infraestructura (desde la raíz)
docker compose up -d

# 2. Backend
cd backend
npm install
cp .env.example .env          # editar JWT_ACCESS_SECRET (ver abajo)
npx prisma migrate dev        # aplica migraciones y genera el cliente
npm run seed                  # crea usuarios de prueba
npm run dev                   # API en http://localhost:3000

# 3. Worker (otra terminal, también en backend/)
npm run worker

# 4. Frontend (otra terminal)
cd frontend
npm install
cp .env.example .env
npm run dev                   # http://localhost:5173
```

> Sin el worker en ejecución los jobs quedan en espera: los tickets no se asignan ni se envían correos.

Generar un secreto para `JWT_ACCESS_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### Usuarios del seed

Contraseña de todos: `Password123!`

| Email                  | Rol    |
|------------------------|--------|
| admin@helpdesk.local   | ADMIN  |
| tech1@helpdesk.local   | TECH   |
| tech2@helpdesk.local   | TECH   |
| client1@helpdesk.local | CLIENT |
| client2@helpdesk.local | CLIENT |

### Tests

```bash
cd backend && npm test
```

Requieren Postgres y Redis levantados y un `.env` válido.

## Variables de entorno

### backend/.env

| Variable                | Obligatoria | Por defecto               | Descripción |
|-------------------------|-------------|---------------------------|-------------|
| `NODE_ENV`              | No          | `development`             | `development`, `test` o `production` |
| `PORT`                  | No          | `3000`                    | Puerto de la API |
| `FRONTEND_URL`          | No          | `http://localhost:5173`   | Origen permitido por CORS (con credentials) |
| `DATABASE_URL`          | Sí          | —                         | Cadena de conexión de PostgreSQL |
| `REDIS_URL`             | No          | `redis://localhost:6379`  | Conexión a Redis (BullMQ) |
| `JWT_ACCESS_SECRET`     | Sí          | —                         | Secreto del access token; mínimo 32 caracteres |
| `SMTP_HOST`             | No          | `localhost`               | Servidor SMTP (Mailpit en local) |
| `SMTP_PORT`             | No          | `1025`                    | Puerto SMTP |
| `MAIL_FROM`             | No          | `HelpDesk Galacticos <no-reply@helpdesk.local>` | Remitente de los correos |
| `SIMULATE_FAILURE_RATE` | No          | `0`                       | Probabilidad (0–1) de que un job falle al azar, para demostrar reintentos |

### frontend/.env

| Variable          | Por defecto             | Descripción |
|-------------------|-------------------------|-------------|
| `VITE_API_ORIGIN` | `http://localhost:3000` | Origen del backend (sin `/api`); debe coincidir con el CORS del backend |

## Colas y reintentos

- `ticket-assignment`: al crear un ticket asigna el TECH con menos tickets abiertos. URGENT/HIGH se procesan con mayor prioridad.
- `notifications`: correos de ticket creado, asignado y cambio de estado.
- Ambas: 3 intentos con backoff exponencial (2 s, 4 s). Los jobs que agotan reintentos quedan `FAILED` y se pueden reintentar con `POST /api/jobs/:queue/:id/retry` (ADMIN).
- Para la demo: `SIMULATE_FAILURE_RATE=0.5` en `backend/.env` (reiniciar worker) y crear tickets; el estado de cada job se ve en `GET /api/tickets/:id/jobs` y `GET /api/jobs`.

## bull-board (panel de colas)

URL: <http://localhost:3000/admin/queues> — solo ADMIN.

El panel se protege con una cookie emitida a administradores, por lo que no se puede abrir sin iniciar el flujo:

1. Inicia sesión como `admin@helpdesk.local` (el access token vive solo en memoria del frontend).
2. Llama a `POST /api/admin/queues/session` con `Authorization: Bearer <accessToken>` (el frontend lo hace desde el enlace del panel de ADMIN). La respuesta es `{ "url": "/admin/queues" }` y deja una cookie válida por 1 hora.
3. Abre <http://localhost:3000/admin/queues> en el mismo navegador.

Desde ahí se ven las colas, los jobs en espera/activos/fallidos y se pueden reintentar o eliminar.

## Mailpit (correo local)

- UI web: <http://localhost:8025>
- SMTP: `localhost:1025` (sin autenticación)

Todos los correos que envía el worker (ticket creado, asignado, cambio de estado) aparecen ahí; no se entrega nada a destinatarios reales.

## Comandos útiles

| Dónde    | Comando                  | Qué hace |
|----------|--------------------------|----------|
| raíz     | `docker compose up -d`   | Levanta postgres, redis y mailpit |
| backend  | `npm run dev`            | API con recarga |
| backend  | `npm run worker`         | Workers de las colas |
| backend  | `npx prisma migrate dev` | Migraciones |
| backend  | `npm run seed`           | Usuarios de prueba |
| backend  | `npm test`               | Tests |
| frontend | `npm run dev`            | Servidor de desarrollo |

Documentación de la API: [docs/ENDPOINTS.md](docs/ENDPOINTS.md). Decisiones de diseño: [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md).
