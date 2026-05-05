import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export const saveProfile = async (req: Request, res: Response) => {
  console.log('--- Incoming Save Profile Request ---');
  console.log('Body:', JSON.stringify(req.body, null, 2));
  
  const { userId, cycleLength, periodDuration, lastPeriodDate, personalityType, socialLevel, privacyLevel, conflictStyle, affectionStyle } = req.body;

  try {
    // Para desarrollo: Asegurar que el usuario existe
    let user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          id: userId,
          email: `${userId}@test.com`,
          passwordHash: 'dummy-hash',
        }
      });
    }

    const profile = await prisma.partnerProfile.upsert({
      where: { userId },
      update: {
        cycleLength,
        periodDuration,
        lastPeriodDate: new Date(lastPeriodDate),
        personalityType,
        socialLevel,
        privacyLevel,
        conflictStyle,
        affectionStyle,
      },
      create: {
        userId,
        cycleLength,
        periodDuration,
        lastPeriodDate: new Date(lastPeriodDate),
        personalityType,
        socialLevel,
        privacyLevel,
        conflictStyle,
        affectionStyle,
      },
    });

    res.status(200).json(profile);
  } catch (error: any) {
    console.error('CRITICAL ERROR saving profile:', error);
    res.status(500).json({ 
        error: 'Failed to save profile',
        detail: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

export const getProfile = async (req: Request, res: Response) => {
  const { userId } = req.params;

  try {
    const profile = await prisma.partnerProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    res.status(200).json(profile);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
};
