// Tipos base del quiz original (mantener compatibilidad)
export type PersonalityType = 'INTROVERTED' | 'EXTROVERTED' | 'AMBIVERT'
export type ConflictStyle   = 'AVOIDANT' | 'DIRECT' | 'PASSIVE'
export type AffectionStyle  = 'PHYSICAL' | 'VERBAL' | 'ACTS' | 'QUALITY'
export type SocialLevel     = 'LOW' | 'MEDIUM' | 'HIGH'
export type PrivacyLevel    = 'VERY_PRIVATE' | 'MODERATE' | 'OPEN'

// Nuevos tipos MBTI
export type MBTIDimension_EI = 'E' | 'I'
export type MBTIDimension_NS = 'N' | 'S'
export type MBTIDimension_FT = 'F' | 'T'
export type MBTIDimension_JP = 'J' | 'P'

export type MBTIType =
  | 'INTJ' | 'INTP' | 'ENTJ' | 'ENTP'
  | 'INFJ' | 'INFP' | 'ENFJ' | 'ENFP'
  | 'ISTJ' | 'ISFJ' | 'ESTJ' | 'ESFJ'
  | 'ISTP' | 'ISFP' | 'ESTP' | 'ESFP'

export type AttachmentStyle = 'ANXIOUS' | 'SECURE' | 'AVOIDANT'

export type InsightContext =
  | 'plan_romantico'
  | 'conflicto_tension'
  | 'necesita_espacio'
  | 'sorpresa_detalle'
  | 'comunicacion_importante'
  | 'dia_dificil'

// Respuestas completas del quiz
export interface QuizAnswers {
  // Dimensión E/I (ya existía como personalityType)
  personalityType: PersonalityType

  // Dimensión N/S — NUEVA
  thinkingStyle: 'INTUITIVE' | 'SENSING'

  // Dimensión F/T — NUEVA
  decisionStyle: 'FEELING' | 'THINKING'

  // Dimensión J/P — NUEVA
  planningStyle: 'JUDGING' | 'PERCEIVING'

  // Ya existían
  conflictStyle: ConflictStyle
  affectionStyle: AffectionStyle
  socialLevel: SocialLevel
  privacyLevel: PrivacyLevel

  // NUEVAS — enriquecimiento
  attachmentStyle: AttachmentStyle
  preferredPlans: 'intimate_home' | 'go_out' | 'movie_night' | 'total_surprise'
  musicMood: 'pop_reggaeton' | 'indie_alternative' | 'classic_jazz' | 'rock_electronic'
  stressedNeeds: 'just_listen' | 'solve_something' | 'space_then_hug' | 'distraction_laughs'
}

// Perfil calculado que se guarda en DB
export interface ComputedPersonalityProfile {
  mbtiType: MBTIType
  mbtiConfidence: {
    EI: number  // 0.0 = puro I, 1.0 = puro E
    NS: number  // 0.0 = puro N, 1.0 = puro S
    FT: number  // 0.0 = puro F, 1.0 = puro T
    JP: number  // 0.0 = puro J, 1.0 = puro P
  }
  attachmentStyle: AttachmentStyle
  preferences: {
    music: string
    plans: string
    stressedNeeds: string
  }
}
