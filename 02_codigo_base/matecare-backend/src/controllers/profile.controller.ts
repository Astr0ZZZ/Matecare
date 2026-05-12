import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { calculateCycleState } from '../services/cycleEngine.service';
import { mapQuizToPersonality } from '../services/personalityMapper.service';
import { QuizAnswers } from '../types/personalityTypes';


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

import { VISION_TRANSLATIONS } from '../services/ai.service';

export const getProfile = async (req: Request, res: Response) => {
  const userId = req.params.userId || (req as any).user?.id;
  
  if (!userId) return res.status(401).json({ error: 'Identidad no válida' });

  const humanize = (val: string) => VISION_TRANSLATIONS[val] || val;

  console.log(`[Profile] Buscando perfil para UID: ${userId}...`);
  try {
    const profile = await prisma.partnerProfile.findUnique({
      where: { userId },
      include: {
        user: {
          select: { points: true, pushToken: true }
        }
      }
    });
    console.log(`[Profile] Resultado PartnerProfile: ${profile ? 'Encontrado' : '404'}`);

    const personality = await prisma.personalityProfile.findUnique({ where: { userId } });
    console.log(`[Profile] Resultado Personality: ${personality ? 'Encontrado' : 'No existe'}`);

    if (!profile) {
      console.log(`[Profile] Devolviendo 404 para ${userId}`);
      return res.status(404).json({ error: 'Perfil no encontrado' });
    }

    // Humanizar preferencias para el móvil
    let humanizedPersonality = null;
    if (personality) {
      const prefs = (personality.preferences as any) || {};
      humanizedPersonality = {
        ...personality,
        preferences: {
          ...prefs,
          preferredPlans: humanize(prefs.preferredPlans),
          musicMood: humanize(prefs.musicMood),
          stressedNeeds: humanize(prefs.stressedNeeds)
        }
      };
    }

    res.status(200).json({ 
      ...profile,
      visualStyle: humanize((profile as any).visualStyle || ""),
      lastEmotion: humanize((profile as any).visionAnalysis?.dominant_emotion || ""),
      mbti: humanizedPersonality, 
      points: profile.user?.points || 0 
    });
  } catch (error) {
    console.error("[Profile] Error:", error);
    res.status(500).json({ error: 'Error al obtener el perfil' });
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
    await prisma.user.update({
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

export const getCycleStatus = async (req: Request, res: Response) => {
  const userId = req.params.userId || (req as any).user?.id;
  
  if (!userId) return res.status(401).json({ error: 'Identidad no válida' });

  try {
    const profile = await prisma.partnerProfile.findUnique({ where: { userId } });
    if (!profile || !profile.lastPeriodDate) {
      return res.status(404).json({ error: 'Perfil o fecha de ciclo no encontrada' });
    }

    const state = calculateCycleState(profile.lastPeriodDate, profile.cycleLength, profile.periodDuration);

    res.json({
      ...state,
      startDate: profile.lastPeriodDate,
      totalLength: profile.cycleLength,
      periodDuration: profile.periodDuration
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al calcular ciclo' });
  }
};
