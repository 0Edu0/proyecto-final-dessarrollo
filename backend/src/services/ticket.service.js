import { prisma } from '../config/prisma.js';
import { AppError } from '../utils/AppError.js';
import { enqueueAssignment, enqueueNotification } from '../queues/index.js';

// Transiciones válidas de estado (ver docs/ARQUITECTURA.md §3)
export const STATUS_TRANSITIONS = {
  OPEN: ['IN_PROGRESS'],
  IN_PROGRESS: ['RESOLVED'],
  RESOLVED: ['IN_PROGRESS', 'CLOSED'],
  CLOSED: [],
};

const userSelect = { select: { id: true, name: true, email: true } };
const include = { createdBy: userSelect, assignedTo: userSelect };

// Filtro de visibilidad según el rol
const visibilityWhere = (user) => {
  if (user.role === 'CLIENT') return { createdById: user.id };
  if (user.role === 'TECH') return { assignedToId: user.id };
  return {};
};

const isAdmin = (user) => user.role === 'ADMIN';

async function findOrFail(id) {
  const ticket = await prisma.ticket.findUnique({ where: { id }, include });
  if (!ticket) throw new AppError(404, 'NOT_FOUND', 'Ticket no encontrado');
  return ticket;
}

// Si Redis falla el ticket ya existe: se responde igual y se registra el error (sin outbox, ver ARQUITECTURA §5)
const enqueueSafely = (...jobs) =>
  Promise.all(jobs.map((job) => job.catch((err) => console.error('[colas] no se pudo encolar:', err.message))));

const forbidden = (msg = 'No tienes permisos para esta acción') => new AppError(403, 'FORBIDDEN', msg);

export async function list(user, { status, priority, page, limit }) {
  const where = { ...visibilityWhere(user), ...(status && { status }), ...(priority && { priority }) };
  const [data, total] = await prisma.$transaction([
    prisma.ticket.findMany({
      where,
      include,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.ticket.count({ where }),
  ]);
  return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

export async function getById(user, id) {
  const ticket = await findOrFail(id);
  const allowed = isAdmin(user) || ticket.createdById === user.id || ticket.assignedToId === user.id;
  if (!allowed) throw forbidden('No tienes acceso a este ticket');
  return ticket;
}

export async function create(user, data) {
  const ticket = await prisma.ticket.create({ data: { ...data, createdById: user.id }, include });
  await enqueueSafely(enqueueAssignment(ticket), enqueueNotification('ticket-created', { ticketId: ticket.id }));
  return ticket;
}

// Editar y borrar: ADMIN, o el dueño mientras el ticket siga OPEN
async function findManageable(user, id) {
  const ticket = await findOrFail(id);
  if (isAdmin(user)) return ticket;
  if (ticket.createdById !== user.id) throw forbidden('No tienes acceso a este ticket');
  if (ticket.status !== 'OPEN') throw forbidden('Solo puedes modificar tickets en estado OPEN');
  return ticket;
}

export async function update(user, id, data) {
  await findManageable(user, id);
  return prisma.ticket.update({ where: { id }, data, include });
}

export async function remove(user, id) {
  await findManageable(user, id);
  await prisma.ticket.delete({ where: { id } });
}

export async function changeStatus(user, id, status) {
  const ticket = await findOrFail(id);
  if (!isAdmin(user) && !(user.role === 'TECH' && ticket.assignedToId === user.id)) {
    throw forbidden('Solo el técnico asignado o un ADMIN puede cambiar el estado');
  }
  if (!STATUS_TRANSITIONS[ticket.status].includes(status)) {
    throw new AppError(409, 'INVALID_TRANSITION', `No se puede pasar de ${ticket.status} a ${status}`);
  }
  const updated = await prisma.ticket.update({ where: { id }, data: { status }, include });
  await enqueueSafely(enqueueNotification('status-changed', { ticketId: id, from: ticket.status, to: status }));
  return updated;
}
