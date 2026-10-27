import { z } from 'zod';
import { ASSIGNMENT_QUEUE, NOTIFICATIONS_QUEUE } from '../queues/defaults.js';

const queue = z.enum([ASSIGNMENT_QUEUE, NOTIFICATIONS_QUEUE]);

export const jobParamsSchema = z.object({ queue, id: z.string().min(1) });

export const listJobsSchema = z.object({
  queue: queue.optional(),
  status: z.enum(['WAITING', 'ACTIVE', 'RETRYING', 'COMPLETED', 'FAILED']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
