import { prisma } from '../src/config/prisma.js';
import { closeQueues, queues } from '../src/queues/index.js';

// Quita de Redis los jobs de los tickets de prueba (antes de borrarlos) y cierra las conexiones
export async function cleanupQueues() {
  const logs = await prisma.jobLog.findMany({
    where: { ticket: { createdBy: { email: { endsWith: '@helpdesk.test' } } } },
    select: { queue: true, jobId: true },
  });
  await Promise.all(logs.map((l) => queues[l.queue].remove(l.jobId).catch(() => {})));
  await closeQueues();
}
