import { Router } from 'express';
import { BOARD_PATH } from '../config/bullBoard.js';
import { authenticate } from '../middlewares/authenticate.js';
import { authorize } from '../middlewares/authorize.js';
import { BOARD_COOKIE, boardCookieOptions, signBoardToken } from '../services/token.service.js';

const router = Router();

router.post('/queues/session', authenticate, authorize('ADMIN'), (req, res) => {
  res.cookie(BOARD_COOKIE, signBoardToken(req.user), boardCookieOptions);
  res.json({ url: BOARD_PATH });
});

export default router;
