import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { redis } from '../lib/redis';
import { calculateCycleState } from '../services/cycleEngine.service';
import { buildMessages } from '../services/promptEngine.service';
import { askAI } from '../services/aiClient.service';
import { getInsight, detectInsightContext } from '../services/insightCache.service';

// Helper para obtener el perfil MBTI del usuario
async function getPersonalityProfile(userId: string) {
  return prisma.personalityProfile.findUnique({ where: { userId } });
}

export const handleChat = async (req: Request, res: Response) => {
  const userId = (req as any).user?.id || req.body.userId;
  const { mensaje, history } = req.body; // Cambiado 'message' a 'mensaje' para coincidir con el frontend

  try {
    const profile = await prisma.partnerProfile.findUnique({ where: { userId } });
    if (!profile) return res.status(404).json({ error: 'Profile not found' });

    const personalityProfile = await getPersonalityProfile(userId);
    const cycle = calculateCycleState(profile.lastPeriodDate, profile.cycleLength, profile.periodDuration);

    // Si tenemos perfil MBTI completo, intentar servir desde cache
    if (personalityProfile?.mbtiType && mensaje) {
      const context = detectInsightContext(mensaje);

      // Para contextos específicos (no conversación general), usar cache
      if (context !== 'plan_romantico') {
        const cachedInsight = await getInsight({
          mbtiType: personalityProfile.mbtiType as any,
          phase: cycle.phase as any,
          context,
          affectionStyle: profile.affectionStyle,
          conflictStyle: profile.conflictStyle,
          attachmentStyle: (personalityProfile.attachmentStyle as any) || 'SECURE',
          preferences: personalityProfile.preferences as any,
        });

        return res.json({ response: cachedInsight, fromCache: true });
      }
    }

    // Conversación general — llamada directa a Gemini con contexto enriquecido
    const trimmedHistory = history ? history.slice(-8) : [];

    const messages = buildMessages({
      phase: cycle.phase,
      dayOfCycle: cycle.dayOfCycle,
      daysUntilNextPhase: cycle.daysUntilNextPhase,
      personalityType: profile.personalityType,
      socialLevel: profile.socialLevel,
      privacyLevel: profile.privacyLevel,
      conflictStyle: profile.conflictStyle,
      affectionStyle: profile.affectionStyle,
      userInput: mensaje,
      interactionHistory: trimmedHistory,
      mbtiType: personalityProfile?.mbtiType as any,
      attachmentStyle: (personalityProfile?.attachmentStyle as any) || undefined,
      preferences: (personalityProfile?.preferences as any) || undefined,
    });

    const aiResponse = await askAI(messages);
    res.json({ response: aiResponse, fromCache: false });

  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Failed to process chat' });
  }
};

export const getDailyRecommendation = async (req: Request, res: Response) => {
  const userId = (req as any).user?.id || req.params.userId;
  console.log(`[AI] Rec request for user: ${userId}`);

  try {
    const profile = await prisma.partnerProfile.findUnique({ where: { userId } });
    if (!profile) return res.status(404).json({ error: 'Profile not found' });

    const cycle = calculateCycleState(profile.lastPeriodDate, profile.cycleLength, profile.periodDuration);

    // Cache de recomendación diaria
    const today = new Date().toISOString().split('T')[0]; 
    const dailyCacheKey = `daily:${userId}:${today}:${cycle.phase}`;

    try {
      const cached = await redis.get(dailyCacheKey);
      if (cached) {
        console.log(`[Cache] Daily rec HIT for ${userId}`);
        return res.json({ recommendation: cached, cycle, fromCache: true });
      }
    } catch (e) { /* Redis opcional */ }

    const personalityProfile = await getPersonalityProfile(userId);

    let aiResponse: string;
    if (personalityProfile?.mbtiType) {
      aiResponse = await getInsight({
        mbtiType: personalityProfile.mbtiType as any,
        phase: cycle.phase as any,
        context: 'plan_romantico',
        affectionStyle: profile.affectionStyle,
        conflictStyle: profile.conflictStyle,
        attachmentStyle: (personalityProfile.attachmentStyle as any) || 'SECURE',
        preferences: personalityProfile.preferences as any,
      });
    } else {
      const messages = buildMessages({
        phase: cycle.phase,
        dayOfCycle: cycle.dayOfCycle,
        daysUntilNextPhase: cycle.daysUntilNextPhase,
        personalityType: profile.personalityType,
        socialLevel: profile.socialLevel,
        privacyLevel: profile.privacyLevel,
        conflictStyle: profile.conflictStyle,
        affectionStyle: profile.affectionStyle,
      });
      aiResponse = await askAI(messages);
    }

    try {
      await redis.set(dailyCacheKey, aiResponse, 'EX', 60 * 60 * 23);
    } catch (e) { /* Redis opcional */ }

    res.json({ recommendation: aiResponse, cycle, fromCache: false });

  } catch (error) {
    res.status(500).json({ error: 'Failed to get recommendation' });
  }
};

