import { Worker } from 'bullmq';
import { connection } from '../queues/connection.js';
import { ASSIGNMENT_QUEUE } from '../queues/defaults.js';
import { enqueueNotification } from '../queues/index.js';
import { assignTicket } from '../services/assignment.service.js';
import { simulateFailure } from '../utils/simulateFailure.js';

async function processor(job) {
  simulateFailure();
  const result = await assignTicket(job.data.ticketId);
  if (result.techId) {
    await enqueueNotification('ticket-assigned', { ticketId: job.data.ticketId, techId: result.techId });
  }
  return result;
}

// Concurrencia 1: evita que dos jobs lean la misma carga y asignen al mismo técnico
export const createAssignmentWorker = () => new Worker(ASSIGNMENT_QUEUE, processor, { connection, concurrency: 1 });
