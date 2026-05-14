import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { calculateCycleState } from '../services/cycleEngine.service';
import { processChat, processChatStream } from '../services/ai.service';

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

    // 1. Lógica de Límites (DESHABILITADO TEMPORALMENTE PARA DESARROLLO)
    /*
    const userMessagesCount = Array.isArray(history) 
      ? history.filter((h: any) => h.role === 'user').length 
      : 0;

    if (userMessagesCount >= 3) {
      return res.json({ 
        response: "Límite táctico alcanzado. Has agotado tus 3 consultas de alta precisión para esta sesión. Reflexiona sobre las tácticas entregadas.", 
        fromCache: true 
      });
    }
    */

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

export const handleChatStream = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  const { mensaje, history } = req.body;
  console.log(`[DEBUG] handleChatStream RECIBIDO - User: ${userId}, Mensaje: ${mensaje}`);

  if (!userId) {
    console.error('[DEBUG] Error: userId no encontrado en la request');
    return res.status(401).json({ error: 'User ID is required' });
  }

  try {
    console.log('[DEBUG] Buscando perfil...');
    const profile = await prisma.partnerProfile.findUnique({ where: { userId } });
    if (!profile) return res.status(404).json({ error: 'Partner profile not found' });
    if (!profile.lastPeriodDate) return res.status(422).json({ error: 'Missing cycle data' });

    const userMessagesCount = Array.isArray(history)
      ? history.filter((h: any) => h.role === 'user').length : 0;

    console.log(`[DEBUG] Perfil encontrado. Mensajes de usuario en historial: ${userMessagesCount}`);

    // [DESACTIVADO PARA PRUEBAS] Límite de 3 mensajes
    /*
    if (userMessagesCount >= 3) {
      console.log('[DEBUG] Límite de 3 mensajes alcanzado. Retornando early exit.');
      res.setHeader('Content-Type', 'text/event-stream');
      res.write(`data: ${JSON.stringify({ token: "Límite táctico alcanzado. Reflexiona sobre las tácticas entregadas.", done: true })}\n\n`);
      return res.end();
    }
    */

    const trimmedHistory = Array.isArray(history)
      ? history.filter((h: any) => (h.role === 'user' || h.role === 'assistant') && typeof h.content === 'string')
               .slice(-6)
               .map((h: any) => ({ role: h.role, content: h.content.slice(0, 150) }))
      : [];

    // Headers SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // Fase 1: Agente 1 (sin stream — necesitamos el JSON completo)
    res.write(`data: ${JSON.stringify({ status: "Analizando situación táctica..." })}\n\n`);
    console.log('[DEBUG] Llamando a processChatStream (Etapa Doble Agente)...');
    const { response, interpreter } = await processChatStream(userId, mensaje, trimmedHistory, res);
    console.log('[DEBUG] processChatStream finalizado.');

    // Guardar interpreter
    if (interpreter) {
      await prisma.partnerProfile.update({
        where: { userId },
        data: { lastInterpreterAnalysis: interpreter } as any
      }).catch(() => {});
    }

    prisma.aIInteraction.create({
      data: { userId, userInput: mensaje, aiResponse: response, phaseContext: 'FOLLICULAR' as any, promptTokens: 0 }
    }).catch(() => {});

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();

  } catch (error) {
    console.error('Chat stream error:', error);
    res.write(`data: ${JSON.stringify({ error: true, token: "Error de conexión con el centro de mando." })}\n\n`);
    res.end();
  }
};

