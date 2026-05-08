import { Router } from 'express';
import { handleChat, getDailyRecommendation } from '../controllers/ai.controller';
import { handleVisionChat, handleProfileCalibration } from '../controllers/vision.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

router.post('/chat', requireAuth, handleChat);
router.post('/vision-chat', requireAuth, handleVisionChat);
router.post('/calibrate-profile', requireAuth, handleProfileCalibration);
router.get('/recommendation/:userId', requireAuth, getDailyRecommendation);

export default router;

