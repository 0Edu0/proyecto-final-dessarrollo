import { AppError } from '../utils/AppError.js';
import { BOARD_COOKIE, verifyBoardToken } from '../services/token.service.js';

// Protege /admin/queues: solo ADMIN con la cookie emitida por POST /api/admin/queues/session
export function authenticateBoard(req, res, next) {
  try {
    verifyBoardToken(req.cookies[BOARD_COOKIE] ?? '');
    next();
  } catch {
    next(new AppError(401, 'UNAUTHORIZED', 'Abre bull-board desde la sesión de ADMIN (POST /api/admin/queues/session)'));
  }
}
