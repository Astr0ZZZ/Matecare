import { Router } from 'express';
import { saveProfile, getProfile } from '../controllers/profile.controller';

const router = Router();

router.post('/', saveProfile);
router.get('/:userId', getProfile);

export default router;
