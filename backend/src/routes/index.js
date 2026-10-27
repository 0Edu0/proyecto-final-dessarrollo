import { Router } from 'express';
import adminRoutes from './admin.routes.js';
import authRoutes from './auth.routes.js';
import jobRoutes from './job.routes.js';
import ticketRoutes from './ticket.routes.js';
import userRoutes from './user.routes.js';

const router = Router();

router.get('/health', (req, res) => res.json({ status: 'ok' }));
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/tickets', ticketRoutes);
router.use('/jobs', jobRoutes);
router.use('/admin', adminRoutes);

export default router;
