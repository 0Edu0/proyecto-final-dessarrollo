import { z } from 'zod';

const priority = z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']);
const status = z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']);

export const idParamSchema = z.object({ id: z.string().uuid() });

export const listTicketsSchema = z.object({
  status: status.optional(),
  priority: priority.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const createTicketSchema = z.object({
  title: z.string().trim().min(3).max(150),
  description: z.string().trim().min(5).max(5000),
  priority: priority.default('MEDIUM'),
});

export const updateTicketSchema = z
  .object({
    title: z.string().trim().min(3).max(150),
    description: z.string().trim().min(5).max(5000),
    priority,
  })
  .partial()
  .refine((d) => Object.keys(d).length > 0, { message: 'Envía al menos un campo' });

export const updateStatusSchema = z.object({ status });
