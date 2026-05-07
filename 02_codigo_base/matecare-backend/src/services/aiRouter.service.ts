import OpenAI from 'openai'
import { askAI } from './aiClient.service'
import { detectCrisisTier } from './crisisDetector.service'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })

export type AITier = 'premium' | 'standard' | 'economy'

export function detectTier(userInput?: string): AITier {
  if (!userInput) return 'economy'
  const crisisTier = detectCrisisTier(userInput)
  if (crisisTier === 'CRITICAL' || crisisTier === 'TENSION') return 'premium'
  return 'standard'
}

export async function routeToAI(
  systemPrompt: string,
  messages: { role: 'user' | 'assistant'; content: string }[],
  _tier: AITier // Ignoramos el tier por ahora para usar la cadena de fallback unificada
): Promise<string> {
  try {
    const formattedMessages = [
      { role: 'system', content: systemPrompt },
      ...messages
    ];

    return await askAI(formattedMessages);
  } catch (err: any) {
    console.error(`[AIRouter] Error fatal: ${err.message}`);
    return "Lo más importante hoy es la presencia tranquila y la escucha activa.";
  }
}
