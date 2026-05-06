import { Router } from 'express';
import { 
  getSuggestedMissions, 
  updateMissionProgress, 
  resetMissions, 
  uploadEvidence,
  getMissionHistory
} from '../controllers/missions.controller';

const router = Router();

router.get('/history/:userId', getMissionHistory);
router.get('/:userId', getSuggestedMissions);
router.patch('/:id/progress', updateMissionProgress);
router.patch('/:id', updateMissionProgress);
router.post('/reset', resetMissions);
router.post('/upload-evidence', uploadEvidence);


export default router;

