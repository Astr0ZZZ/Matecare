import { Router } from 'express';
import { getCurrentCycle } from '../controllers/cycle.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

router.get('/current/:userId', requireAuth, getCurrentCycle);
router.get('/current', requireAuth, getCurrentCycle);

export default router;
