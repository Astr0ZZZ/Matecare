import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { calculateCycleState } from '../services/cycleEngine.service';
import { processChat, getOracleAdvice } from '../services/ai.service';

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
 * Handler principal para el chat interactivo (v5.0 Unified Engine)
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

    // 1. Lógica de Límites (3 preguntas máximo)
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

    // 3. Orquestador Unificado (v5.0)
    const { response: aiResponse } = await processChat(userId, mensaje, image, trimmedHistory);
    
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

    // Obtener recomendación usando el Oráculo (Él ya maneja su propio caché interno de 20h)
    const aiResponse = await getOracleAdvice(userId);

    return res.json({ 
      recommendation: aiResponse, 
      cycle, 
      fromCache: true // Siempre true si viene del service optimizado
    });



  } catch (error) {
    console.error('Recommendation error:', error);
    return res.status(500).json({ error: 'Failed to get daily recommendation' });
  }
};
