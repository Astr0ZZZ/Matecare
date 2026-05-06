import OpenAI from 'openai'
import { askAI } from './aiClient.service'
import { detectCrisisTier } from './crisisDetector.service'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })

export type AITier = 'premium' | 'standard' | 'economy'

/**
 * Mapeo estratégico de modelos 2026 (Priorizando Coste-Efectividad)
 * Economy: Gemini 2.0 Flash-Lite ($0.07 / 1M)
 * Standard: GPT-4o-mini ($0.15 / 1M)
 * Premium: GPT-4o ($2.50 / 1M)
 */
const MODEL_MAP: Record<AITier, string> = {
  economy: 'gemini-3.1-flash-lite-preview-0303',
  standard: 'gpt-5.5-instant',
  premium: 'gpt-5.5-pro',
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
  const model = MODEL_MAP[tier]

  try {
    // Si el modelo es de Google (Gemini), usamos el servicio de Gemini directamente (más barato)
    if (model.startsWith('gemini')) {
      return askAI([
        { role: 'system', content: systemPrompt },
        ...messages
      ])
    }

    // Si es de OpenAI (Standard o Premium)
    const response = await openai.chat.completions.create({
      model,
      max_tokens: tier === 'premium' ? 800 : 400,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages
      ],
      temperature: 0.7
    })

    return response.choices[0].message.content ?? ''
  } catch (err: any) {
    console.warn(`[AIRouter] Fallo en ${model}: ${err.message}. Reintentando con Gemini.`)
    return askAI([
      { role: 'system', content: systemPrompt },
      ...messages
    ])
  }
}
