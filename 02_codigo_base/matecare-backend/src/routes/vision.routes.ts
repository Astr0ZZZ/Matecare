import { Router } from 'express';
import { handleVisionChat, handleProfileCalibration } from '../controllers/vision.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

/**
 * Rutas unificadas para el motor de visión MateCare v2.1
 */

// Sincronización de emoción en tiempo real
router.post('/vision-chat', requireAuth, handleVisionChat);

// Calibración de perfil basada en visión
router.post('/calibrate-profile', requireAuth, handleProfileCalibration);

export default router;
