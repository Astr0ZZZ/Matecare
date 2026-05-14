import { Router } from 'express';
import { 
  getSuggestedMissions, 
  updateMissionProgress, 
  resetMissions, 
  getMissionHistory,
  submitMissionEvidence
} from '../controllers/missions.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

router.get('/history/:userId', requireAuth, getMissionHistory);
router.get('/:userId', requireAuth, getSuggestedMissions);
router.get('/', requireAuth, getSuggestedMissions);
router.patch('/:id/progress', requireAuth, updateMissionProgress);
router.post('/:id/evidence', requireAuth, submitMissionEvidence);
router.post('/reset', requireAuth, resetMissions);


export default router;

