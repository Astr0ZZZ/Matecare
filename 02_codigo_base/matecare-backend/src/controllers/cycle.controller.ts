import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { calculateCycleState } from '../services/cycleEngine.service';

export const getCurrentCycle = async (req: Request, res: Response) => {
  const userId = req.params.userId || (req as any).user?.id;

  if (!userId) return res.status(401).json({ error: 'User ID is required' });

  try {
    const profile = await prisma.partnerProfile.findUnique({ 
      where: { userId } 
    });

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const cycleState = calculateCycleState(
      profile.lastPeriodDate,
      profile.cycleLength,
      profile.periodDuration
    );

    res.json(cycleState);
  } catch (error) {
    console.error('Error getting cycle state:', error);
    res.status(500).json({ error: 'Failed to calculate cycle' });
  }
};
