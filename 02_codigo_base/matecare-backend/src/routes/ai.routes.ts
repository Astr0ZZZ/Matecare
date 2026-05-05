import { Router } from 'express';
import { handleChat, getDailyRecommendation } from '../controllers/ai.controller';

const router = Router();

router.post('/chat', handleChat);
router.get('/recommendation/:userId', getDailyRecommendation);

export default router;
