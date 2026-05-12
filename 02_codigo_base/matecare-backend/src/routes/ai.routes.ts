import { Router } from 'express';
import { handleChat, getDailyRecommendation } from '../controllers/ai.controller';
import { handleVisionChat } from '../controllers/vision.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// Rutas de IA Generativa
router.post('/chat', requireAuth, handleChat);
router.get('/recommendation/:userId', requireAuth, getDailyRecommendation);

// Rutas de Visión Táctica (Consolidadas en vision-chat v5.1)
router.post('/vision-chat', requireAuth, handleVisionChat);

export default router;
