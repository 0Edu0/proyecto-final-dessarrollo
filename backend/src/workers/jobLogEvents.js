import { enqueueNotification } from '../queues/index.js';
import { logActive, logCompleted, logFailed } from '../services/jobLog.service.js';

// Los eventos de un mismo job se escriben en orden (active nunca pisa a completed)
const chains = new Map();

function serial(key, task) {
  const next = (chains.get(key) ?? Promise.resolve())
    .then(task)
    .catch((err) => console.error(`[jobLog] no se pudo registrar ${key}:`, err.message))
    .finally(() => chains.get(key) === next && chains.delete(key));
  chains.set(key, next);
}

// Avisa por correo a los ADMIN cuando un job agota reintentos. Las alertas que fallan no generan otra alerta (evita bucle)
function alertAdmins(queue, job, err) {
  if (job.name === 'job-failed-alert') return;
  enqueueNotification('job-failed-alert', {
    ticketId: job.data?.ticketId,
    queue,
    jobName: job.name,
    jobId: String(job.id),
    attempts: job.attemptsMade,
    error: err.message,
  }).catch((e) => console.error(`[${queue}] no se pudo encolar la alerta a admins:`, e.message));
}

// Registra en JobLog cada intento (active), éxito (completed) y fallo (failed → RETRYING o FAILED)
export function attachJobLogEvents(worker) {
  const queue = worker.name;
  const key = (job) => `${queue}:${job.id}`;

  worker.on('active', (job) => {
    console.log(`[${queue}] ${job.name} ${job.id} → intento ${job.attemptsMade + 1}`);
    serial(key(job), () => logActive(queue, job));
  });
  worker.on('completed', (job) => {
    console.log(`[${queue}] ${job.name} ${job.id} ✓`);
    serial(key(job), () => logCompleted(queue, job));
  });
  worker.on('failed', (job, err) => {
    if (!job) return; // job desconocido (p. ej. stalled sin datos)
    console.warn(`[${queue}] ${job.name} ${job.id} ✗ intento ${job.attemptsMade}/${job.opts.attempts}: ${err.message}`);
    serial(key(job), () => logFailed(queue, job, err));
    if (job.attemptsMade >= (job.opts.attempts ?? 1)) alertAdmins(queue, job, err);
  });
  worker.on('error', (err) => console.error(`[${queue}] error del worker:`, err.message));
}
