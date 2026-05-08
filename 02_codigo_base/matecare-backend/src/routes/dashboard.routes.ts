import { Router } from 'express';
import { getDashboardSummary } from '../controllers/dashboard.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

router.get('/ping', (req, res) => res.json({ message: 'Dashboard API is alive' }));
router.get('/summary/:userId', requireAuth, getDashboardSummary);

export default router;
