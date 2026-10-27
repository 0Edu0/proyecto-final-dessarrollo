import { Router } from 'express';
import * as ctrl from '../controllers/job.controller.js';
import { authenticate } from '../middlewares/authenticate.js';
import { authorize } from '../middlewares/authorize.js';
import { validate } from '../middlewares/validate.js';
import { jobParamsSchema, listJobsSchema } from '../validators/job.js';
import { asyncHandler as h } from '../utils/asyncHandler.js';

const router = Router();

router.use(authenticate);
router.get('/', authorize('ADMIN'), validate(listJobsSchema, 'query'), h(ctrl.list));
router.get('/:queue/:id', validate(jobParamsSchema, 'params'), h(ctrl.getById));
router.post('/:queue/:id/retry', authorize('ADMIN'), validate(jobParamsSchema, 'params'), h(ctrl.retry));

export default router;
