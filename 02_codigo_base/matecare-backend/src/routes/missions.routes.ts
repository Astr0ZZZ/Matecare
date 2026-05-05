import { Router } from 'express';
import { getSuggestedMissions, updateMissionProgress } from '../controllers/missions.controller';

const router = Router();

router.get('/:userId', getSuggestedMissions);
router.patch('/:id', updateMissionProgress);

export default router;
