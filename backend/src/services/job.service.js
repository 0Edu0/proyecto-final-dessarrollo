import { queues } from '../queues/index.js';
import { AppError } from '../utils/AppError.js';
import { findLog, resetForRetry } from './jobLog.service.js';
import * as ticketService from './ticket.service.js';

const getQueueJob = (queue, jobId) => queues[queue].getJob(jobId);

// Estado del JobLog + estado vivo en BullMQ (null si el job ya salió de Redis por removeOnComplete)
export async function getJob(user, queue, jobId) {
  const log = await findLog(queue, jobId);
  if (!log) throw new AppError(404, 'NOT_FOUND', 'Job no encontrado');

  // Mismo acceso que al ticket; los jobs sin ticket (borrado) son solo para ADMIN
  if (log.ticketId) await ticketService.getById(user, log.ticketId);
  else if (user.role !== 'ADMIN') throw new AppError(403, 'FORBIDDEN', 'No tienes permisos para esta acción');

  const job = await getQueueJob(queue, jobId);
  const bullmq = job && {
    state: await job.getState(),
    attemptsMade: job.attemptsMade,
    maxAttempts: job.opts.attempts,
    failedReason: job.failedReason || null,
  };
  return { ...log, bullmq };
}

export async function retryJob(queue, jobId) {
  const job = await getQueueJob(queue, jobId);
  if (!job) throw new AppError(404, 'NOT_FOUND', 'Job no encontrado en Redis');
  const state = await job.getState();
  if (state !== 'failed') {
    throw new AppError(409, 'CONFLICT', `Solo se pueden reintentar jobs fallidos (estado actual: ${state})`);
  }
  // resetAttemptsMade: vuelve a tener sus 3 intentos con backoff, no uno solo
  await job.retry('failed', { resetAttemptsMade: true });
  await resetForRetry(queue, jobId);
  return { queue, jobId, state: 'waiting' };
}
