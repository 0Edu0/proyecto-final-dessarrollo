import { z } from 'zod';

const role = z.enum(['CLIENT', 'TECH', 'ADMIN']);

export const listUsersSchema = z.object({ role: role.optional() });

export const updateRoleSchema = z.object({ role });
