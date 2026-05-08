import { Router } from 'express';
import { registerToken } from '../controllers/notifications.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

router.post('/register-token', requireAuth, registerToken);

export default router;
