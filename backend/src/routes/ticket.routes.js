import { Router } from 'express';
import * as ctrl from '../controllers/ticket.controller.js';
import { authenticate } from '../middlewares/authenticate.js';
import { authorize } from '../middlewares/authorize.js';
import { validate } from '../middlewares/validate.js';
import {
  createTicketSchema,
  idParamSchema,
  listTicketsSchema,
  updateStatusSchema,
  updateTicketSchema,
} from '../validators/ticket.js';
import { asyncHandler as h } from '../utils/asyncHandler.js';

const router = Router();

router.use(authenticate);
router.get('/', validate(listTicketsSchema, 'query'), h(ctrl.list));
router.post('/', authorize('CLIENT', 'ADMIN'), validate(createTicketSchema), h(ctrl.create));
router.get('/:id', validate(idParamSchema, 'params'), h(ctrl.getById));
router.get('/:id/jobs', validate(idParamSchema, 'params'), h(ctrl.jobs));
router.patch('/:id', validate(idParamSchema, 'params'), validate(updateTicketSchema), h(ctrl.update));
router.delete('/:id', validate(idParamSchema, 'params'), h(ctrl.remove));
router.patch('/:id/status', validate(idParamSchema, 'params'), validate(updateStatusSchema), h(ctrl.changeStatus));

export default router;
