export type AITier = 'economy' | 'standard' | 'premium'

export interface AIMessage {
  role: 'user' | 'assistant'
  content: string
}
