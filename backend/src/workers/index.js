import { env } from '../config/env.js';
import { prisma } from '../config/prisma.js';
import { closeQueues } from '../queues/index.js';
import { createAssignmentWorker } from './assignment.worker.js';
import { createNotificationsWorker } from './notifications.worker.js';
import { attachJobLogEvents } from './jobLogEvents.js';

// Proceso separado de la API: npm run worker
const workers = [createAssignmentWorker(), createNotificationsWorker()];
workers.forEach(attachJobLogEvents);

console.log(`Workers listos (${workers.map((w) => w.name).join(', ')}) — SIMULATE_FAILURE_RATE=${env.SIMULATE_FAILURE_RATE}`);

async function shutdown() {
  console.log('Cerrando workers...');
  await Promise.all(workers.map((w) => w.close()));
  await closeQueues();
  await prisma.$disconnect();
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
