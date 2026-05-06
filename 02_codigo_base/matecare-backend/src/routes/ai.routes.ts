import { Router } from 'express';
import { handleChat, getDailyRecommendation } from '../controllers/ai.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

router.post('/chat', requireAuth, handleChat);
router.get('/recommendation/:userId', requireAuth, getDailyRecommendation);

export default router;

