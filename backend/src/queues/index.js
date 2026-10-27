import { randomUUID } from 'node:crypto';
import { Queue } from 'bullmq';
import { connection } from './connection.js';
import { ASSIGNMENT_QUEUE, NOTIFICATIONS_QUEUE, JOB_PRIORITY, defaultJobOptions } from './defaults.js';
import { createWaiting, deleteLog } from '../services/jobLog.service.js';

export const assignmentQueue = new Queue(ASSIGNMENT_QUEUE, { connection, defaultJobOptions });
export const notificationsQueue = new Queue(NOTIFICATIONS_QUEUE, { connection, defaultJobOptions });

export const queues = {
  [ASSIGNMENT_QUEUE]: assignmentQueue,
  [NOTIFICATIONS_QUEUE]: notificationsQueue,
};

// Deja la fila WAITING en JobLog y luego encola; si Redis falla se borra la fila
async function enqueue(queue, name, data, opts = {}) {
  const jobId = opts.jobId ?? `${name}-${randomUUID()}`;
  await createWaiting({ queue: queue.name, jobId, name, ticketId: data.ticketId, payload: data });
  try {
    return await queue.add(name, data, { ...opts, jobId });
  } catch (err) {
    await deleteLog(queue.name, jobId);
    throw err;
  }
}

// jobId fijo: encolar dos veces el mismo ticket no duplica la asignación
export const enqueueAssignment = (ticket) =>
  enqueue(assignmentQueue, 'assign', { ticketId: ticket.id }, {
    jobId: `assign-${ticket.id}`,
    priority: JOB_PRIORITY[ticket.priority],
  });

// name: ticket-created | ticket-assigned | status-changed | job-failed-alert
export const enqueueNotification = (name, data) => enqueue(notificationsQueue, name, data);

export async function closeQueues() {
  await Promise.all([assignmentQueue.close(), notificationsQueue.close()]);
  await connection.quit();
}
