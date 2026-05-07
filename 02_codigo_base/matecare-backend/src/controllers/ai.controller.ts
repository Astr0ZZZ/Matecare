import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { redis, isConnected as isRedisConnected } from '../lib/redis';
import { calculateCycleState } from '../services/cycleEngine.service';
import { buildMasterPrompt } from '../services/promptEngine.service';
import { askAI } from '../services/aiClient.service';
import { routeToAI, detectTier } from '../services/aiRouter.service';
import { getInsight, detectInsightContext } from '../services/insightCache.service';
import type { MBTIType, AttachmentStyle } from '../../../shared/types/personality.types';
import type { CyclePhase, AffectionStyle, ConflictStyle } from '@prisma/client';

// Cache en memoria para cuando Redis está offline
const memoryCache: Record<string, string> = {};

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
  const userId = req.user?.id;
  const { mensaje, history } = req.body;

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

    // 1. Lógica de Cache con Insight Engine
    if (personalityProfile?.mbtiType && mensaje) {
      const context = detectInsightContext(mensaje);

      // Si el contexto es específico y diferente a plan_romantico, usamos el cache de insights
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

    const messages = await buildMasterPrompt(userId, mensaje, trimmedHistory);
    
    // Inyectar reglas de precisión
    const lastMsg = messages[messages.length - 1];
    lastMsg.content += ". REGLA CRÍTICA: Solo tienes permitido responder de forma extremadamente precisa. Solo una de tus respuestas en toda la conversación puede ser extensa (máximo 100 palabras), las demás deben ser de máximo 50 palabras. No uses introducciones innecesarias.";

    const tier = detectTier(mensaje);
    const aiResponse = await routeToAI(messages[0].content, messages.slice(1).map(m => ({ role: m.role as any, content: m.content })), tier);
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

    // Cache Key basada en fase actual para ahorrar tokens
    const dailyCacheKey = `daily:${userId}:${cycle.phase}`;

    console.log(`[AI] Recomendación por fase para ${userId} (${cycle.phase})`);

    // 1. Intentar Caché
    if (isRedisConnected) {
      try {
        const cached = await redis.get(dailyCacheKey);
        if (cached) {
          console.log(`[Cache] HIT Redis: ${dailyCacheKey}`);
          return res.json({ recommendation: cached, cycle, fromCache: true });
        }
      } catch (redisError) {
        console.warn("[Cache] Fallo en lectura Redis, intentando memoria...");
      }
    }

    const memoryCached = memoryCache[dailyCacheKey];
    if (memoryCached) {
      console.log(`[Cache] HIT Memory: ${dailyCacheKey}`);
      return res.json({ recommendation: memoryCached, cycle, fromCache: true });
    }

    console.log(`[AI] Cache MISS. Llamando a Matriz Táctica GPT-5...`);

    const personalityProfile = await getPersonalityProfile(userId);
    let aiResponse: string = "";

    // Si tiene perfil MBTI, usamos el motor de insights (más rápido/barato)
    if (personalityProfile?.mbtiType) {
      aiResponse = await getInsight({
        mbtiType: personalityProfile.mbtiType as MBTIType,
        phase: cycle.phase as CyclePhase,
        context: 'plan_romantico',
        affectionStyle: profile.affectionStyle as AffectionStyle,
        conflictStyle: profile.conflictStyle as ConflictStyle,
        attachmentStyle: (personalityProfile.attachmentStyle as AttachmentStyle) ?? 'SECURE',
        preferences: personalityProfile.preferences as { music?: string; plans?: string; stressedNeeds?: string } | undefined,
      });
    } else {
      // Usar el ensamblador para recomendación diaria
      const messages = await buildMasterPrompt(userId);
      messages[messages.length - 1].content += ". Responde en un solo párrafo corto de máximo 60 palabras.";
      const tier = detectTier(); 
      aiResponse = await routeToAI(messages[0].content, messages.slice(1).map(m => ({ role: m.role as any, content: m.content })), tier);
    }

    // Guardar en Redis y Memoria
    try {
      memoryCache[dailyCacheKey] = aiResponse;
      if (isRedisConnected) {
        await redis.set(dailyCacheKey, aiResponse, { EX: 82800 });
        console.log(`[Cache] Guardado en Redis: ${dailyCacheKey}`);
      }
    } catch (redisError) {
      console.warn("[Cache] Error guardando en Redis, mantenido en memoria.");
    }

    return res.json({ recommendation: aiResponse, cycle, fromCache: false });

  } catch (error) {
    console.error('Recommendation error:', error);
    return res.status(500).json({ error: 'Failed to get daily recommendation' });
  }
};
