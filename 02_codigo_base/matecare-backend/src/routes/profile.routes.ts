import { Router } from 'express';
import { saveProfile, getProfile, getRanking, updatePushToken, getCycleStatus } from '../controllers/profile.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

router.use((req, res, next) => {
  console.log(`[ProfileRouter] ${req.method} ${req.url}`);
  next();
});

router.post('/', requireAuth, saveProfile);
router.get('/', requireAuth, getProfile); 
router.post('/push-token', requireAuth, updatePushToken);
router.get('/current/:userId', requireAuth, getCycleStatus);
router.get('/leaderboard/all', requireAuth, getRanking);

export default router;
