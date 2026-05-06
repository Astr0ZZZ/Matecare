import { Router } from 'express';
import { saveProfile, getProfile, getRanking } from '../controllers/profile.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

router.post('/', requireAuth, saveProfile);
router.get('/leaderboard/all', requireAuth, getRanking);
router.get('/:userId', requireAuth, getProfile);

export default router;
