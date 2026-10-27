import { AppError } from '../utils/AppError.js';

// Uso: authorize('ADMIN', 'TECH') después de authenticate
export const authorize = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return next(new AppError(403, 'FORBIDDEN', 'No tienes permisos para esta acción'));
  }
  next();
};
