import {
  CyclePhase, PersonalityType, SocialLevel,
  PrivacyLevel, ConflictStyle, AffectionStyle
} from '@prisma/client';
import { prisma } from '../lib/prisma';
import { calculateCycleState } from './cycleEngine.service';
import { MBTIType, AttachmentStyle } from '../../../shared/types/personality.types';
import {
  MBTI_DESCRIPTIONS,
  ATTACHMENT_DESCRIPTIONS,
  PREFERENCE_DESCRIPTIONS
} from './personalityMapper.service';

export interface PromptContext {
  phase: CyclePhase;
  dayOfCycle: number;
  daysUntilNextPhase: number;
  personalityType: PersonalityType;
  socialLevel: SocialLevel;
  privacyLevel: PrivacyLevel;
  conflictStyle: ConflictStyle;
  affectionStyle: AffectionStyle;
  userInput?: string;
  interactionHistory?: { role: 'user' | 'assistant'; content: string }[];

  mbtiType?: MBTIType;
  attachmentStyle?: AttachmentStyle;
  preferences?: {
    music?: string;
    plans?: string;
    stressedNeeds?: string;
  };
}

const PHASE_DESCRIPTIONS: Record<CyclePhase, string> = {
  MENSTRUAL: `Fase Menstrual: Hormonas bajas, posible dolor y cansancio. Necesita comodidad, validación de su sentir y descanso. Evita planes demandantes.`,
  FOLLICULAR: `Fase Folicular: Energía en aumento, optimismo y apertura social. Buen momento para proponer ideas y salir de la rutina.`,
  OVULATION: `Fase Ovulatoria: Pico de energía y libido. Máxima apertura emocional y física. El mejor momento para la conexión romántica profunda.`,
  LUTEAL: `Fase Lútea: Sensibilidad emocional alta, posible irritabilidad o necesidad de espacio (PMS). Requiere paciencia blindada, validación y detalles reconfortantes.`
};

const PERSONALITY_DESCRIPTIONS: Record<PersonalityType, string> = {
  INTROVERTED: 'Introvertida: prefiere la calma y la intimidad.',
  EXTROVERTED: 'Extrovertida: disfruta lo social y la energía externa.',
  AMBIVERT: 'Ambivertida: equilibra momentos sociales con necesidad de quietud.'
};

const CONFLICT_DESCRIPTIONS: Record<ConflictStyle, string> = {
  AVOIDANT: 'Evitativo: ante tensión necesita espacio, no presión.',
  DIRECT: 'Directo: prefiere hablar claro y resolver rápido.',
  PASSIVE: 'Pasivo-Agresivo: comunica su malestar de forma indirecta, requiere leer entre líneas.'
};

const AFFECTION_DESCRIPTIONS: Record<AffectionStyle, string> = {
  PHYSICAL: 'Contacto físico (abrazos, presencia).',
  VERBAL: 'Palabras de afirmación (halagos, reconocimiento).',
  ACTS: 'Actos de servicio (ayuda proactiva).',
  QUALITY: 'Tiempo de calidad (atención total).'
};

/**
 * Construye el Master Prompt Táctico.
 */
export function buildSystemPrompt(ctx: PromptContext): string {
  const currentPhaseDesc = PHASE_DESCRIPTIONS[ctx.phase];
  const mbtiDesc = ctx.mbtiType ? `${ctx.mbtiType} — ${MBTI_DESCRIPTIONS[ctx.mbtiType]}` : 'Perfil base';
  const attachmentDesc = ctx.attachmentStyle ? ATTACHMENT_DESCRIPTIONS[ctx.attachmentStyle] : 'Estándar';
  
  return `Eres MateCare, un copiloto emocional premium y discreto para hombres modernos. 
Tu objetivo es dar consejos breves, prácticos y empáticos sobre cómo comunicarse con su pareja basándote en su biología y personalidad.
NO suenes como un médico, terapeuta ni chatbot genérico. Responde como un amigo sabio, elegante y directo.

CONTEXTO ACTUAL DE LA PAREJA:
- Fase del ciclo: ${ctx.phase} (${currentPhaseDesc}).
- Progreso: Día ${ctx.dayOfCycle} del ciclo. Faltan ${ctx.daysUntilNextPhase} días para la siguiente fase.
- Personalidad (MBTI): ${mbtiDesc}.
- Estilo de apego: ${attachmentDesc}.
- Estilo de conflicto: ${CONFLICT_DESCRIPTIONS[ctx.conflictStyle]}.
- Lenguaje de amor: ${AFFECTION_DESCRIPTIONS[ctx.affectionStyle]}.
${ctx.preferences?.stressedNeeds ? `- Necesidad bajo estrés: ${ctx.preferences.stressedNeeds}` : ''}

REGLAS DE RESPUESTA:
1. Adapta tu consejo estrictamente a la fase del ciclo (Ej: en LUTEAL prioriza la contención y la calma).
2. Considera su personalidad para el tono de la comunicación recomendada.
3. Sé directo, masculino y elegante. Máximo 2-3 párrafos cortos.
4. Explica brevemente la razón biológica detrás de tu consejo si es relevante.
5. Si detectas una crisis reportada, sé extremadamente empático pero mantén la calma.

Responde siempre en español, manteniendo un tono de alta sofisticación y utilidad práctica.`;
}

/**
 * Función ensambladora que consulta datos y construye el conjunto de mensajes.
 */
export async function buildMasterPrompt(userId: string, userQuery?: string, history?: { role: 'user' | 'assistant'; content: string }[]) {
  // 1. Obtener datos de Prisma
  const [profile, personalityProfile] = await Promise.all([
    prisma.partnerProfile.findUnique({ where: { userId } }),
    prisma.personalityProfile.findUnique({ where: { userId } })
  ]);

  if (!profile || !profile.lastPeriodDate) {
    throw new Error('Perfil de pareja incompleto');
  }

  // 2. Calcular estado del ciclo
  const cycle = calculateCycleState(profile.lastPeriodDate, profile.cycleLength, profile.periodDuration);

  // 3. Preparar contexto
  const ctx: PromptContext = {
    phase: cycle.phase,
    dayOfCycle: cycle.dayOfCycle,
    daysUntilNextPhase: cycle.daysUntilNextPhase,
    personalityType: profile.personalityType,
    socialLevel: profile.socialLevel,
    privacyLevel: profile.privacyLevel,
    conflictStyle: profile.conflictStyle,
    affectionStyle: profile.affectionStyle,
    userInput: userQuery,
    interactionHistory: history,
    mbtiType: personalityProfile?.mbtiType as MBTIType | undefined,
    attachmentStyle: personalityProfile?.attachmentStyle as AttachmentStyle | undefined,
    preferences: personalityProfile?.preferences as any
  };

  // 4. Construir mensajes para la IA
  const system = buildSystemPrompt(ctx);
  const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
    { role: 'system' as const, content: system },
  ];

  if (history && history.length > 0) {
    messages.push(...history.map(h => ({ 
      role: h.role === 'user' ? 'user' as const : 'assistant' as const, 
      content: h.content 
    })));
  }

  if (userQuery) {
    messages.push({ role: 'user' as const, content: userQuery });
  } else {
    // Para recomendaciones diarias automáticas
    messages.push({ role: 'user' as const, content: "Dame el consejo táctico del día basado en su estado actual." });
  }

  return messages;
}

// Mantener compatibilidad con controllers existentes que usan buildMessages
export function buildMessages(ctx: PromptContext) {
  const system = buildSystemPrompt(ctx);
  const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
    { role: 'system' as const, content: system },
  ];

  if (ctx.interactionHistory) {
    messages.push(...ctx.interactionHistory.map(h => ({ 
      role: h.role === 'user' ? 'user' as const : 'assistant' as const, 
      content: h.content 
    })));
  }

  if (ctx.userInput) {
    messages.push({ role: 'user' as const, content: ctx.userInput });
  } else {
    messages.push({ role: 'user' as const, content: "Dame el consejo táctico del día para hoy basado en su estado actual." });
  }

  return messages;
}
