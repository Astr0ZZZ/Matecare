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
  userTier?: string;
  visionContext?: {
    dominantEmotion: string;
    energyAppearance: string;
    environment: string;
    style: string;
    bodyLanguage?: string;
    activityLevel?: string;
    sceneCategory?: string;
    lightCondition?: string;
    timeOfDayHint?: string;
    ambientMood?: string;
    clothingTone?: string;
    // NUEVO v2.1
    allEmotions?: Record<string, number>;
    faceConfidence?: number;
    isAuthentic?: boolean | null;
    isSuppressed?: boolean;
    authenticityLabel?: string;
    hasDiscrepancy?: boolean;
    analysisReliable?: boolean;
    emotionalHistory?: string; // NUEVO v2.1
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
  
  const visionBlock = ctx.visionContext
    ? buildVisionBlock(ctx.visionContext)
    : "";

  return `Eres MateCare, un copiloto emocional premium y discreto para hombres modernos. 
Tu objetivo es dar consejos BREVES, TÁCTICOS y directos. No te extiendas.
NO suenes como un médico ni terapeuta. Responde como un amigo elegante, sofisticado y con calle.

CONTEXTO ACTUAL DE LA PAREJA:
- Fase del ciclo: ${ctx.phase} (${currentPhaseDesc}).
- Progreso: Día ${ctx.dayOfCycle} del ciclo. Faltan ${ctx.daysUntilNextPhase} días para la siguiente fase.
- Personalidad (MBTI): ${mbtiDesc}.
- Estilo de apego: ${attachmentDesc}.
- Estilo de conflicto: ${CONFLICT_DESCRIPTIONS[ctx.conflictStyle]}.
- Lenguaje de amor: ${AFFECTION_DESCRIPTIONS[ctx.affectionStyle]}.
${ctx.preferences?.stressedNeeds ? `- Necesidad bajo estrés: ${ctx.preferences.stressedNeeds}` : ''}
${visionBlock}

REGLAS DE ORO PARA TUS RESPUESTAS:
1. BREVEDAD ABSOLUTA: Máximo 2 párrafos cortos.
2. IDENTIFICACIÓN VISUAL (CRÍTICO): Si se te ha proporcionado una imagen, comienza OBLIGATORIAMENTE tu respuesta con un tag de metadatos en este formato exacto: [ENTORNO: nombre_entorno, ESTILO: nombre_estilo]. Ejemplos: [ENTORNO: Restaurante, ESTILO: Elegante] o [ENTORNO: Calle, ESTILO: Casual]. Luego continúa con tu respuesta normal.
3. ESTRATEGIA DE TENSIÓN Y DESEO (MODO ATREVIDO): Este es un pilar fundamental de MateCare. 
   - Durante OVULATION y FOLLICULAR: Sugiere contacto físico audaz, frases de doble sentido elegantes y planes que aumenten la dopamina y la oxitocina (ej: una cena con luz tenue, un susurro al oído). Sé un facilitador de la pasión.
   - Tu consejo debe ayudar al hombre a ser un "Alfa Elegante": seguro de sí mismo, protector pero deseante.
4. ADAPTACIÓN AL ENTORNO: Si detectas EXTERIOR, sugierle que aproveche el aire libre para una conexión espontánea. Si detectas RESTAURANTE, sugiere gestos de complicidad bajo la mesa.
5. LENGUAJE PREMIUM: Usa términos como "estrategia", "fase táctica", "blindaje emocional".

Responde siempre en español. Sé el James Bond de los copilotos emocionales: sofisticado, directo y siempre un paso adelante en el juego de la seducción.`;
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

  // 3. Determinar Tier del usuario
  const { determineTier } = require('./aiRouter.service');
  const userTier = await determineTier(userId);

  // 4. Preparar contexto
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
    preferences: personalityProfile?.preferences as any,
    visionContext: (personalityProfile?.preferences as any)?.dominantEmotion ? (personalityProfile?.preferences as any) : undefined,
    userTier
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

/**
 * Construye el bloque de contexto visual para el prompt.
 * V2.1: Incluye análisis de autenticidad y discrepancia.
 */
function buildVisionBlock(vc: NonNullable<PromptContext['visionContext']>): string {
  const vc_label = vc.authenticityLabel || vc.dominantEmotion;

  // Construir distribución emocional si está disponible
  const emotionDist = vc.allEmotions
    ? Object.entries(vc.allEmotions)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([e, v]) => `${e}: ${Math.round(v)}%`)
        .join(' · ')
    : null;

  // Sección de alerta de discrepancia o supresión
  let alertBlock = '';
  if (vc.hasDiscrepancy) {
    alertBlock = `
⚠️ DISCREPANCIA EMOCIONAL: Muestra "${vc_label}" pero las señales subyacentes sugieren otra emoción. 
   Está presentando una emoción diferente a la que realmente siente.
   PRIORIDAD MÁXIMA: Responde a lo no dicho, no a la expresión superficial.`;
  } else if (vc.isSuppressed) {
    alertBlock = `
⚡ SUPRESIÓN DETECTADA: Está conteniendo activamente la emoción de "${vc.dominantEmotion}".
   La está gestionando/controlando. Valida eso con delicadeza, no lo ignores.`;
  }

  if (vc.analysisReliable === false) {
    alertBlock += `
⚠️ CONFIANZA LIMITADA: El análisis tiene restricciones por ángulo o iluminación (confianza: ${Math.round((vc.faceConfidence || 0) * 100)}%).
   Da más peso al historial de chat que a la lectura visual en este caso.`;
  }

  return `
LECTURA VISUAL AVANZADA (v2.1):
- Estado emocional: **${vc_label}** (Energía: ${vc.energyAppearance})${emotionDist ? `\n  Distribución: ${emotionDist}` : ''}
- Postura corporal: ${vc.bodyLanguage || 'desconocida'} (Actividad: ${vc.activityLevel || 'n/a'})
- Escena: ${vc.sceneCategory || vc.environment} (${vc.lightCondition || 'luz estándar'}, ${vc.timeOfDayHint || 'hora n/a'})
- Vibra ambiental: ${vc.ambientMood || 'neutra'}
- Estilo vestimenta: ${vc.style} / tono ${vc.clothingTone || 'n/a'}
${vc.emotionalHistory ? `- Tendencia reciente: ${vc.emotionalHistory}` : ''}
${alertBlock}

INSTRUCCIÓN CRÍTICA: Cruza OBLIGATORIAMENTE la fase del ciclo con esta lectura visual.
${vc.hasDiscrepancy
  ? 'La emoción visual CONTRADICE la expresión mostrada — responde a la emoción real, no a la social.'
  : 'Si la lectura visual contradice la fase esperada, prioriza lo visual sobre la teoría del ciclo.'
}
Adapta el consejo al ambiente detectado (restaurante → complicidad íntima, hogar → confort, exterior → espontaneidad).`;
}
