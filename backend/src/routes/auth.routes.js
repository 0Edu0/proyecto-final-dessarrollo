import { Router } from 'express';
import * as ctrl from '../controllers/auth.controller.js';
import { authenticate } from '../middlewares/authenticate.js';
import { authLimiter } from '../middlewares/rateLimit.js';
import { validate } from '../middlewares/validate.js';
import { loginSchema, registerSchema } from '../validators/auth.js';
import { asyncHandler as h } from '../utils/asyncHandler.js';

const router = Router();

router.use(authLimiter);
router.post('/register', validate(registerSchema), h(ctrl.register));
router.post('/login', validate(loginSchema), h(ctrl.login));
router.post('/refresh', h(ctrl.refresh));
router.post('/logout', h(ctrl.logout));
router.get('/me', authenticate, h(ctrl.me));

export default router;
