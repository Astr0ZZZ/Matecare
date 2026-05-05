import { Router } from 'express';
import { getCurrentPhase, getForecast } from '../controllers/cycle.controller';

const router = Router();

router.get('/current/:userId', getCurrentPhase);
router.get('/forecast/:userId', getForecast);

export default router;
