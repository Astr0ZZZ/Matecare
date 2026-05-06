import OpenAI from 'openai'
import { askAI } from './aiClient.service'
import { detectCrisisTier } from './crisisDetector.service'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })

export type AITier = 'premium' | 'standard' | 'economy'

const MODEL_MAP: Record<AITier, string> = {
  economy:  'gpt-4.1-nano',
  standard: 'gpt-4.1-mini',
  premium:  'gpt-4o',
}

/**
 * Detecta el tier de IA necesario basado en el input del usuario
 */
export function detectTier(userInput?: string): AITier {
  if (!userInput) return 'economy'
  
  const crisisTier = detectCrisisTier(userInput)
  if (crisisTier === 'CRITICAL' || crisisTier === 'TENSION') {
    return 'premium'
  }
  
  return 'standard'
}

/**
 * Enruta la petición al modelo de OpenAI correspondiente al tier.
 * Si OpenAI falla, hace fallback automático a Gemini.
 */
export async function routeToAI(
  systemPrompt: string,
  messages: { role: 'user' | 'assistant'; content: string }[],
  tier: AITier
): Promise<string> {
  const model = MODEL_MAP[tier]

  try {
    const response = await openai.chat.completions.create({
      model,
      max_tokens: 600,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages
      ]
    })
    
    return response.choices[0].message.content ?? ''
  } catch (err: any) {
    console.warn(`[AIRouter] OpenAI (${model}) falló: ${err.message}. Usando Gemini como fallback.`)
    
    // Fallback final a Gemini (askAI ya maneja internamente su propia cascada)
    return askAI([
      { role: 'system', content: systemPrompt },
      ...messages
    ])
  }
}
