import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { mapQuizToPersonality } from '../services/personalityMapper.service';
import { QuizAnswers } from '../../../shared/types/personality.types';

export const saveProfile = async (req: Request, res: Response) => {
  console.log('--- Incoming Save Profile Request ---');

  const userId = (req as any).user?.id || req.body.userId;
  const email = (req as any).user?.email || `${userId}@matecare.com`;

  const {
    cycleLength, periodDuration, lastPeriodDate,
    personalityType, socialLevel, privacyLevel, conflictStyle, affectionStyle,
    thinkingStyle, decisionStyle, planningStyle,
    attachmentStyle, preferredPlans, musicMood, stressedNeeds
  } = req.body;

  if (!userId) return res.status(401).json({ error: 'Usuario no identificado' });

  try {
    let user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      user = await prisma.user.create({
        data: { id: userId, email: email, passwordHash: 'auth-managed' }
      });
    }

    // Normalizar fecha para evitar el error de "un día menos" por zona horaria
    const normalizedDate = lastPeriodDate ? new Date(`${lastPeriodDate.split('T')[0]}T12:00:00`) : new Date();

    const profile = await prisma.partnerProfile.upsert({
      where: { userId },
      update: { cycleLength, periodDuration, lastPeriodDate: normalizedDate, personalityType, socialLevel, privacyLevel, conflictStyle, affectionStyle },
      create: { userId, cycleLength, periodDuration, lastPeriodDate: normalizedDate, personalityType, socialLevel, privacyLevel, conflictStyle, affectionStyle },
    });

    if (thinkingStyle && decisionStyle && planningStyle) {
      const quizAnswers: QuizAnswers = {
        personalityType, socialLevel, privacyLevel, conflictStyle, affectionStyle,
        thinkingStyle, decisionStyle, planningStyle,
        attachmentStyle: attachmentStyle || 'SECURE',
        preferredPlans: preferredPlans || 'intimate_home',
        musicMood: musicMood || 'pop_reggaeton',
        stressedNeeds: stressedNeeds || 'just_listen',
      };

      const computed = mapQuizToPersonality(quizAnswers);

      const existingPersonality = await prisma.personalityProfile.findUnique({ where: { userId } });
      const mergedPreferences = {
        ...(existingPersonality?.preferences as any || {}),
        ...(computed.preferences || {})
      };

      await prisma.personalityProfile.upsert({
        where: { userId },
        update: {
          mbtiType: computed.mbtiType,
          mbtiConfidence: computed.mbtiConfidence,
          attachmentStyle: computed.attachmentStyle,
          preferences: mergedPreferences,
        },
        create: {
          userId,
          mbtiType: computed.mbtiType,
          mbtiConfidence: computed.mbtiConfidence,
          attachmentStyle: computed.attachmentStyle,
          preferences: computed.preferences,
        }
      });

      console.log(`[Profile] MBTI calculado: ${computed.mbtiType} para ${userId}`);
    }

    res.status(200).json(profile);

  } catch (error: any) {
    console.error('CRITICAL ERROR saving profile:', error);
    res.status(500).json({ error: 'Failed to save profile', detail: error.message });
  }
};

export const getProfile = async (req: Request, res: Response) => {
  const userId = req.params.userId || (req as any).user?.id;
  try {
    const [profile, personalityProfile, user] = await Promise.all([
      prisma.partnerProfile.findUnique({ where: { userId } }),
      prisma.personalityProfile.findUnique({ where: { userId } }),
      prisma.user.findUnique({ where: { id: userId }, select: { points: true } })
    ]);
    if (!profile) return res.status(404).json({ error: 'Profile not found' });
    res.status(200).json({ ...profile, mbti: personalityProfile, points: user?.points || 0 });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
};

export const getRanking = async (req: Request, res: Response) => {
  try {
    const topUsers = await prisma.user.findMany({
      take: 10,
      orderBy: { points: 'desc' },
      select: {
        id: true,
        email: true,
        points: true,
      }
    });
    
    const maskedRanking = topUsers.map((u, i) => ({
      rank: i + 1,
      name: u.email.split('@')[0],
      points: u.points
    }));

    res.json(maskedRanking);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch ranking' });
  }
};

export const updatePushToken = async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  const { token } = req.body;

  if (!userId || !token) {
    return res.status(400).json({ error: 'User ID and Token are required' });
  }

  try {
    await (prisma.user as any).update({
      where: { id: userId },
      data: { pushToken: token }
    });
    console.log(`[PUSH] Token registrado para usuario ${userId}`);
    res.json({ success: true });
  } catch (error) {
    console.error('[PUSH] Error registrando token:', error);
    res.status(500).json({ error: 'Failed to update push token' });
  }
};
