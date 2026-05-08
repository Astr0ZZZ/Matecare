import { Router } from 'express';
import { saveProfile, getProfile, getRanking } from '../controllers/profile.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

router.use((req, res, next) => {
  console.log(`[ProfileRouter] ${req.method} ${req.url}`);
  next();
});

router.post('/', requireAuth, saveProfile);
router.get('/', requireAuth, getProfile); // New: fetch profile of current authenticated user
router.get('/leaderboard/all', requireAuth, getRanking);
router.get('/:userId', requireAuth, getProfile);

export default router;
