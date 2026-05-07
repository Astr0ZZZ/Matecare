import { Router } from 'express';
import { 
  getSuggestedMissions, 
  updateMissionProgress, 
  resetMissions, 
  uploadEvidence,
  getMissionHistory
} from '../controllers/missions.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

router.get('/history/:userId', requireAuth, getMissionHistory);
router.get('/:userId', requireAuth, getSuggestedMissions);
router.patch('/:id/progress', requireAuth, updateMissionProgress);
router.patch('/:id', requireAuth, updateMissionProgress);
router.post('/reset', requireAuth, resetMissions);
router.post('/upload-evidence', requireAuth, uploadEvidence);


export default router;

