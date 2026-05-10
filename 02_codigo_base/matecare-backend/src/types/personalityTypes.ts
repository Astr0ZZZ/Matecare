export type MBTIType = 
  | 'INTJ' | 'INTP' | 'ENTJ' | 'ENTP'
  | 'INFJ' | 'INFP' | 'ENFJ' | 'ENFP'
  | 'ISTJ' | 'ISFJ' | 'ESTJ' | 'ESFJ'
  | 'ISTP' | 'ISFP' | 'ESTP' | 'ESFP';

export type AttachmentStyle = 'SECURE' | 'ANXIOUS' | 'AVOIDANT';

export interface QuizAnswers {
  personalityType?: 'EXTROVERTED' | 'INTROVERTED' | 'AMBIVERT';
  thinkingStyle?: 'SENSING' | 'INTUITIVE';
  decisionStyle?: 'THINKING' | 'FEELING';
  planningStyle?: 'PERCEIVING' | 'JUDGING';
  socialLevel?: 'LOW' | 'MEDIUM' | 'HIGH';
  privacyLevel?: 'VERY_PRIVATE' | 'MODERATE' | 'OPEN';
  conflictStyle?: 'AVOIDANT' | 'DIRECT' | 'PASSIVE';
  affectionStyle?: 'PHYSICAL' | 'VERBAL' | 'ACTS' | 'QUALITY';
  attachmentStyle: AttachmentStyle;
  musicMood?: string;
  preferredPlans?: string;
  stressedNeeds?: string;
  mbti?: Record<string, string>;
  preferences?: Record<string, any>;
}

export interface ComputedPersonalityProfile {
  mbtiType: MBTIType;
  mbtiConfidence: {
    EI: number;
    NS: number;
    FT: number;
    JP: number;
  };
  attachmentStyle: AttachmentStyle;
  preferences: Record<string, any>;
}

export enum InsightContext {
  plan_romantico = 'plan_romantico',
  conflicto_tension = 'conflicto_tension',
  necesita_espacio = 'necesita_espacio',
  sorpresa_detalle = 'sorpresa_detalle',
  comunicacion_importante = 'comunicacion_importante',
  dia_dificil = 'dia_dificil',
  plan_tactic_diario = 'plan_tactic_diario'
}
