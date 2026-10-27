import { ZodError } from 'zod';
import { AppError } from '../utils/AppError.js';

export function errorHandler(err, req, res, next) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Datos inválidos', details: err.flatten().fieldErrors },
    });
  }
  if (err instanceof AppError) {
    const body = { code: err.code, message: err.message };
    if (err.details) body.details = err.details;
    return res.status(err.status).json({ error: body });
  }
  // JSON mal formado u otros errores de body-parser
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'JSON inválido' } });
  }
  console.error(err);
  res.status(500).json({ error: { code: 'INTERNAL', message: 'Error interno del servidor' } });
}
