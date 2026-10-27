import { z } from 'zod';

// Mismas reglas que backend/src/validators
const email = z.string().trim().toLowerCase().min(1, 'El correo es obligatorio').email('Correo inválido');

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'La contraseña es obligatoria'),
});

export const registerSchema = z
  .object({
    name: z.string().trim().min(2, 'Mínimo 2 caracteres').max(100, 'Máximo 100 caracteres'),
    email,
    password: z.string().min(8, 'Mínimo 8 caracteres').max(72, 'Máximo 72 caracteres'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Las contraseñas no coinciden',
  });

export const ticketSchema = z.object({
  title: z.string().trim().min(3, 'Mínimo 3 caracteres').max(150, 'Máximo 150 caracteres'),
  description: z.string().trim().min(5, 'Mínimo 5 caracteres').max(5000, 'Máximo 5000 caracteres'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
});
