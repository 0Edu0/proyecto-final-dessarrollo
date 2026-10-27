import { prisma } from '../config/prisma.js';

// Crea la fila WAITING antes de encolar, así los eventos del worker siempre la encuentran.
// upsert sin cambios: si el job ya existe (jobId idempotente) no se pisa su estado.
export const createWaiting = ({ queue, jobId, name, ticketId, payload }) =>
  prisma.jobLog.upsert({
    where: { queue_jobId: { queue, jobId } },
    update: {},
    create: { queue, jobId, name, ticketId, payload },
  });

export const deleteLog = (queue, jobId) => prisma.jobLog.deleteMany({ where: { queue, jobId } });

// Actualiza la fila de un job; la crea si el job llegó sin pasar por el servicio (p. ej. desde bull-board)
function upsertEvent(queue, job, data) {
  return prisma.jobLog.upsert({
    where: { queue_jobId: { queue, jobId: job.id } },
    update: data,
    create: { queue, jobId: job.id, name: job.name, ticketId: job.data?.ticketId, payload: job.data, ...data },
  });
}

export const logActive = (queue, job) =>
  upsertEvent(queue, job, { status: 'ACTIVE', attempts: job.attemptsMade + 1 });

export const logCompleted = (queue, job) =>
  upsertEvent(queue, job, { status: 'COMPLETED', finishedAt: new Date() });

// attemptsMade ya incluye el intento que acaba de fallar
export function logFailed(queue, job, err) {
  const exhausted = job.attemptsMade >= (job.opts.attempts ?? 1);
  return upsertEvent(queue, job, {
    status: exhausted ? 'FAILED' : 'RETRYING',
    attempts: job.attemptsMade,
    error: err.message,
    finishedAt: exhausted ? new Date() : null,
  });
}

// Condicional a FAILED: si el worker ya tomó el job reintentado, no se pisa su estado ACTIVE
export const resetForRetry = (queue, jobId) =>
  prisma.jobLog.updateMany({
    where: { queue, jobId, status: 'FAILED' },
    data: { status: 'WAITING', attempts: 0, finishedAt: null },
  });

export const findLog = (queue, jobId) => prisma.jobLog.findUnique({ where: { queue_jobId: { queue, jobId } } });

export const listByTicket = (ticketId) => prisma.jobLog.findMany({ where: { ticketId }, orderBy: { createdAt: 'asc' } });

export async function list({ queue, status, page, limit }) {
  const where = { ...(queue && { queue }), ...(status && { status }) };
  const [data, total] = await prisma.$transaction([
    prisma.jobLog.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
    prisma.jobLog.count({ where }),
  ]);
  return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}
