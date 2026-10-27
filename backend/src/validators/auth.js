import { z } from 'zod';

const email = z.string().trim().toLowerCase().email();

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email,
  password: z.string().min(8).max(72), // bcrypt ignora más de 72 bytes
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1),
});
