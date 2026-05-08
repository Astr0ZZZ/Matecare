import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { redis, isConnected as isRedisConnected } from '../lib/redis';
import { calculateCycleState } from '../services/cycleEngine.service';
import { getInsight, detectInsightContext } from '../services/insightCache.service';
import type { MBTIType, AttachmentStyle } from '../../../shared/types/personality.types';
import type { CyclePhase, AffectionStyle, ConflictStyle } from '@prisma/client';
import { processChat } from '../services/ai.service';

// Cache en memoria para cuando Redis está offline
const memoryCache: Record<string, string> = {};

/**
 * Interfaces para mejorar el tipado
 */
interface AuthRequest extends Request {
  user?: { id: string };
}

// Helper para obtener el perfil MBTI del usuario
async function getPersonalityProfile(userId: string) {
  return prisma.personalityProfile.findUnique({ where: { userId } });
}

/**
 * Handler principal para el chat interactivo (v3.0 Two-Agent System)
 */
export const handleChat = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  const { mensaje, history, image } = req.body;

  if (!userId) {
    return res.status(401).json({ error: 'User ID is required' });
  }

  try {
    const profile = await prisma.partnerProfile.findUnique({ where: { userId } });
    if (!profile) return res.status(404).json({ error: 'Partner profile not found' });

    if (!profile.lastPeriodDate) {
      return res.status(422).json({ error: 'Partner profile is missing cycle data (lastPeriodDate)' });
    }

    const personalityProfile = await getPersonalityProfile(userId);
    const cycle = calculateCycleState(profile.lastPeriodDate, profile.cycleLength, profile.periodDuration);

    // 1. Lógica de Cache con Insight Engine (mantenemos para velocidad)
    if (personalityProfile?.mbtiType && mensaje && !image) {
      const context = detectInsightContext(mensaje);
      if (context !== 'plan_romantico') {
        const cachedInsight = await getInsight({
          mbtiType: personalityProfile.mbtiType as MBTIType,
          phase: cycle.phase as CyclePhase,
          context,
          affectionStyle: profile.affectionStyle as AffectionStyle,
          conflictStyle: profile.conflictStyle as ConflictStyle,
          attachmentStyle: (personalityProfile.attachmentStyle as AttachmentStyle) ?? 'SECURE',
          preferences: personalityProfile.preferences as { music?: string; plans?: string; stressedNeeds?: string } | undefined,
        });

        if (cachedInsight) {
          return res.json({ response: cachedInsight, fromCache: true });
        }
      }
    }

    // 2. Lógica de Límites (3 preguntas máximo)
    const userMessagesCount = Array.isArray(history) 
      ? history.filter((h: any) => h.role === 'user').length 
      : 0;

    if (userMessagesCount >= 3) {
      return res.json({ 
        response: "Límite táctico alcanzado. Has agotado tus 3 consultas de alta precisión para esta sesión. Reflexiona sobre las tácticas entregadas.", 
        fromCache: true 
      });
    }

    const trimmedHistory = Array.isArray(history)
      ? history
          .filter(
            (h): h is { role: 'user' | 'assistant'; content: string } =>
              h !== null &&
              typeof h === 'object' &&
              (h.role === 'user' || h.role === 'assistant') &&
              typeof h.content === 'string'
          )
          .slice(-6)
      : [];

    // 3. Orquestador de Dos Agentes (v3.0)
    const aiResponse = await processChat(userId, mensaje, image, trimmedHistory);
    
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
  const userId = req.user?.id;
  
  if (!userId) {
    return res.status(401).json({ error: 'User ID is required' });
  }

  try {
    const profile = await prisma.partnerProfile.findUnique({ where: { userId } });
    if (!profile) return res.status(404).json({ error: 'Profile not found' });

    if (!profile.lastPeriodDate) {
      return res.status(422).json({ error: 'Partner profile is missing cycle data (lastPeriodDate)' });
    }

    const cycle = calculateCycleState(profile.lastPeriodDate, profile.cycleLength, profile.periodDuration);

    // Cache Key basada en fase actual
    const dailyCacheKey = `daily:${userId}:${cycle.phase}`;

    // 1. Intentar Caché
    if (isRedisConnected) {
      try {
        const cached = await redis.get(dailyCacheKey);
        if (cached) return res.json({ recommendation: cached, cycle, fromCache: true });
      } catch (redisError) {}
    }

    const memoryCached = memoryCache[dailyCacheKey];
    if (memoryCached) return res.json({ recommendation: memoryCached, cycle, fromCache: true });

    // 2. Generar Recomendación usando el nuevo sistema (mensaje vacío para recomendación base)
    const aiResponse = await processChat(userId, "Dame mi recomendación táctica del día basada en su fase actual.", undefined, []);

    // Guardar en Cache
    memoryCache[dailyCacheKey] = aiResponse;
    if (isRedisConnected) {
      await redis.set(dailyCacheKey, aiResponse, { EX: 82800 });
    }

    return res.json({ recommendation: aiResponse, cycle, fromCache: false });

  } catch (error) {
    console.error('Recommendation error:', error);
    return res.status(500).json({ error: 'Failed to get daily recommendation' });
  }
};
