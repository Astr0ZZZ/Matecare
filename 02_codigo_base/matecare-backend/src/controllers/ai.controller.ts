import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { redis } from '../lib/redis';
import { calculateCycleState } from '../services/cycleEngine.service';
import { buildMessages } from '../services/promptEngine.service';
import { askAI } from '../services/aiClient.service';
import { getInsight, detectInsightContext } from '../services/insightCache.service';

/**
 * Interfaces para mejorar el tipado y evitar el uso excesivo de 'any'
 */
interface AuthRequest extends Request {
  user?: { id: string };
}

// Helper para obtener el perfil MBTI del usuario
async function getPersonalityProfile(userId: string) {
  return prisma.personalityProfile.findUnique({ where: { userId } });
}

/**
 * Handler principal para el chat interactivo
 */
export const handleChat = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id || req.body.userId;
  const { mensaje, history } = req.body;

  if (!userId) {
    return res.status(401).json({ error: 'User ID is required' });
  }

  try {
    const profile = await prisma.partnerProfile.findUnique({ where: { userId } });
    if (!profile) return res.status(404).json({ error: 'Partner profile not found' });

    const personalityProfile = await getPersonalityProfile(userId);
    const cycle = calculateCycleState(profile.lastPeriodDate, profile.cycleLength, profile.periodDuration);

    // 1. Lógica de Cache con Insight Engine
    if (personalityProfile?.mbtiType && mensaje) {
      const context = detectInsightContext(mensaje);

      // Si el contexto es específico y diferente a plan_romantico, usamos el cache de insights
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

        if (cachedInsight) {
          return res.json({ response: cachedInsight, fromCache: true });
        }
      }
    }

    // 2. Conversación general (Llamada a AI)
    const trimmedHistory = Array.isArray(history) ? history.slice(-8) : [];

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
    return res.json({ response: aiResponse, fromCache: false });

  } catch (error) {
    console.error('Chat error:', error);
    return res.status(500).json({ error: 'Internal server error during chat processing' });
  }
};

/**
 * Obtener recomendación diaria basada en el ciclo
 */
export const getDailyRecommendation = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id || req.params.userId;
  
  if (!userId) {
    return res.status(401).json({ error: 'User ID is required' });
  }

  try {
    const profile = await prisma.partnerProfile.findUnique({ where: { userId } });
    if (!profile) return res.status(404).json({ error: 'Profile not found' });

    const cycle = calculateCycleState(profile.lastPeriodDate, profile.cycleLength, profile.periodDuration);

    // Cache Key basada en fecha, usuario y fase actual
    const today = new Date().toISOString().split('T')[0]; 
    const dailyCacheKey = `daily:${userId}:${today}:${cycle.phase}`;

    // Intento leer de Redis
    try {
      const cached = await redis.get(dailyCacheKey);
      if (cached) {
        return res.json({ recommendation: cached, cycle, fromCache: true });
      }
    } catch (redisError) {
      console.warn('[Redis] Error reading cache:', redisError);
    }

    const personalityProfile = await getPersonalityProfile(userId);
    let aiResponse: string = "";

    // Si tiene perfil MBTI, usamos el motor de insights (más rápido/barato)
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
      // Fallback a construcción de prompt genérico
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
      aiResponse = (await askAI(messages)) || "";
    }

    // Guardar en Redis (Expira en 23 horas para asegurar refresco diario)
    try {
      await redis.setex(dailyCacheKey, 82800, aiResponse);
    } catch (redisError) {
      console.warn('[Redis] Error saving cache:', redisError);
    }

    return res.json({ recommendation: aiResponse, cycle, fromCache: false });

  } catch (error) {
    console.error('Recommendation error:', error);
    return res.status(500).json({ error: 'Failed to get daily recommendation' });
  }
};
