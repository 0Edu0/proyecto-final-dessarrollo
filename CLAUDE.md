# HelpDesk Galacticos — Sistema de Tickets de Soporte

Proyecto universitario. Entrega: 31/10/2026. Prioridad: que funcione en la demo, código limpio, sin sobreingeniería.

## Stack (no cambiar sin preguntar)
- Monorepo: `/backend` y `/frontend` separados, `docker-compose.yml` en la raíz.
- Backend: Node.js 20 + Express + JavaScript (ESM). Prisma + PostgreSQL. Zod para validación.
- Auth: JWT access token (15 min, en memoria del frontend) + refresh token (7 días, cookie httpOnly, rotación y revocación guardada en BD). bcrypt para contraseñas.
- Colas: BullMQ + Redis. Workers en proceso separado (`npm run worker`). Panel bull-board en `/admin/queues` (solo rol ADMIN).
- Correo: Nodemailer contra Mailpit (SMTP local, UI en http://localhost:8025).
- Seguridad: helmet, cors (origen del frontend, credentials), express-rate-limit en /auth.
- Frontend: React + Vite + React Router + TanStack Query + React Hook Form + Zod + Axios. CSS simple (Tailwind permitido).

## Dominio
- Roles: CLIENT (crea y ve sus tickets), TECH (ve tickets asignados, cambia estado), ADMIN (todo + usuarios + panel de colas).
- Ticket: id, title, description, priority (LOW|MEDIUM|HIGH|URGENT), status (OPEN|IN_PROGRESS|RESOLVED|CLOSED), createdById, assignedToId?, timestamps.
- JobLog: registra cada trabajo de cola (queue, jobId, ticketId, status, attempts, error, timestamps) para mostrarlo en el frontend.

## Colas (núcleo de la nota: 6/25)
1. `ticket-assignment`: al crear ticket, asigna el TECH con menos tickets abiertos; URGENT/HIGH con mayor prioridad de job.
2. `notifications`: envía correo (ticket creado, asignado, cambio de estado).
- Todas: `attempts: 3`, `backoff: { type: 'exponential', delay: 2000 }`, `removeOnComplete` limitado.
- `SIMULATE_FAILURE_RATE` (0–1) en .env hace fallar jobs al azar para la demo de reintentos.
- Jobs que agotan reintentos quedan en estado failed y se registran en JobLog; endpoint para reintentarlos.

## Convenciones
- Estructura backend: `src/{config,routes,controllers,services,middlewares,validators,queues,workers,utils}`.
- Respuestas de error uniformes: `{ error: { code, message, details? } }` mediante un middleware central.
- Comentarios y textos de UI en español; identificadores en inglés.
- No agregar dependencias fuera del stack sin preguntar.
- Tras cada cambio relevante: correr el linter/tests del paquete afectado, no de todo el repo.

## Comandos
- `docker compose up -d` (postgres, redis, mailpit)
- backend: `npm run dev`, `npm run worker`, `npx prisma migrate dev`, `npm run seed`, `npm test`
- frontend: `npm run dev`

## Forma de trabajar
- Cambios pequeños y por fases; no tocar archivos ajenos a la tarea.
- No leer `node_modules`, `dist`, lockfiles ni migraciones generadas salvo que sea necesario.
- Respuestas breves: resumen de lo hecho y archivos cambiados, sin repetir el código.

# Compact instructions
Al compactar, conservar: fase actual, decisiones tomadas, archivos creados, errores pendientes. Descartar salidas de comandos.
