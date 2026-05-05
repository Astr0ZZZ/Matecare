// Router de IA con fallback de 3 niveles
// Referencia: MateCare_pagos_IA_resiliente.md sección 2
// economy → standard → premium con caché Redis

export type AITier = 'premium' | 'standard' | 'economy'

export function detectTier(userInput?: string): AITier {
  // TODO: implementar detección por keywords de crisis
  return userInput ? 'standard' : 'economy'
}

export async function routeToAI(
  systemPrompt: string,
  messages: { role: 'user' | 'assistant'; content: string }[],
  tier: AITier
): Promise<string> {
  // TODO: implementar — ver documento pagos_IA_resiliente sección 2
  throw new Error('Not implemented')
}
