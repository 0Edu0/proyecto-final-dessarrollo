import { Worker } from 'bullmq';
import { connection } from '../queues/connection.js';
import { NOTIFICATIONS_QUEUE } from '../queues/defaults.js';
import { sendNotification } from '../services/notification.service.js';
import { simulateFailure } from '../utils/simulateFailure.js';

async function processor(job) {
  if (job.name !== 'job-failed-alert') simulateFailure(); // la alerta a admins no se simula: debe llegar siempre
  return sendNotification(job.name, job.data);
}

export const createNotificationsWorker = () => new Worker(NOTIFICATIONS_QUEUE, processor, { connection, concurrency: 5 });
