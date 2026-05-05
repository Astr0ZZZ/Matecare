import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { calculateCycleState } from '../services/cycleEngine.service';

export const getCurrentPhase = async (req: Request, res: Response) => {
  const { userId } = req.params;

  try {
    const profile = await prisma.partnerProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const state = calculateCycleState(
      profile.lastPeriodDate,
      profile.cycleLength,
      profile.periodDuration
    );

    res.status(200).json(state);
  } catch (error) {
    console.error('Error getting phase:', error);
    res.status(500).json({ error: 'Failed to calculate phase' });
  }
};

export const getForecast = async (req: Request, res: Response) => {
  // TODO: Implement forecast logic if needed
  res.status(501).json({ error: 'Not implemented' });
};
