import { Router } from 'express';
import { getCurrentPhase, getForecast } from '../controllers/cycle.controller';

import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

router.get('/current/:userId', requireAuth, getCurrentPhase);
router.get('/forecast/:userId', requireAuth, getForecast);

export default router;
