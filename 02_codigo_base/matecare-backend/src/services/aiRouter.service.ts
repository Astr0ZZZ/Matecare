import OpenAI from 'openai'
import { askAI } from './aiClient.service'
import { detectCrisisTier } from './crisisDetector.service'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })

import { prisma } from '../lib/prisma'

export type AITier = 'premium' | 'standard' | 'economy'

export async function determineTier(userId: string): Promise<string> {
  try {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { points: true } });
    const pts = user?.points || 0;
    
    if (pts < 100) return "NOVATO TÁCTICO";
    if (pts < 500) return "OPERATIVO MATECARE";
    if (pts < 1500) return "GUARDIÁN DE LA ARMONÍA";
    return "MAESTRO DE LA MATRIZ";
  } catch (err) {
    console.error('[AIRouter] Error determining tier:', err);
    return "OPERATIVO ESTÁNDAR";
  }
}

export function detectTier(userInput?: string): AITier {
  if (!userInput) return 'economy'
  const crisisTier = detectCrisisTier(userInput)
  if (crisisTier === 'CRITICAL' || crisisTier === 'TENSION') return 'premium'
  return 'standard'
}

export async function routeToAI(
  systemPrompt: string,
  messages: { role: 'user' | 'assistant'; content: string }[],
  tier: AITier
): Promise<string> {
  try {
    const formattedMessages = [
      { role: 'system', content: systemPrompt },
      ...messages
    ];

    return await askAI(formattedMessages, tier);
  } catch (err: any) {
    console.error(`[AIRouter] Error fatal: ${err.message}`);
    return "Lo más importante hoy es la presencia tranquila y la escucha activa.";
  }
}
