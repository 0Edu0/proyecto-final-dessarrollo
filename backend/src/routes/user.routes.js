import { Router } from 'express';
import * as ctrl from '../controllers/user.controller.js';
import { authenticate } from '../middlewares/authenticate.js';
import { authorize } from '../middlewares/authorize.js';
import { validate } from '../middlewares/validate.js';
import { idParamSchema } from '../validators/ticket.js';
import { listUsersSchema, updateRoleSchema } from '../validators/user.js';
import { asyncHandler as h } from '../utils/asyncHandler.js';

const router = Router();

router.use(authenticate, authorize('ADMIN'));
router.get('/', validate(listUsersSchema, 'query'), h(ctrl.list));
router.patch('/:id/role', validate(idParamSchema, 'params'), validate(updateRoleSchema), h(ctrl.updateRole));

export default router;
