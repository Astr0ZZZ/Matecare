import {
  CyclePhase, PersonalityType, SocialLevel,
  PrivacyLevel, ConflictStyle, AffectionStyle
} from '@prisma/client';
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

  // NUEVOS — opcionales para compatibilidad
  mbtiType?: MBTIType;
  attachmentStyle?: AttachmentStyle;
  preferences?: {
    music?: string;
    plans?: string;
    stressedNeeds?: string;
  };
}

const PHASE_DESCRIPTIONS: Record<CyclePhase, string> = {
  MENSTRUAL: `Su cuerpo está en fase menstrual. Hormonas en su punto más bajo (estrógeno y progesterona bajas). Puede sentir cansancio, dolores, necesidad de calor y descanso. Emocionalmente puede estar más sensible, introspectiva o irritable. Necesita comodidad, no estímulos.`,
  FOLLICULAR: `Está en fase folicular. El estrógeno está subiendo. Energía y ánimo en aumento progresivo. Es social, creativa, optimista. Buena disposición para planes, conversaciones y novedad. Es el mejor momento para proponer cosas nuevas.`,
  OVULATION: `Está en fase de ovulación. Pico máximo de estrógeno y testosterona. Energía y libido en su punto más alto. Está comunicativa, cálida, muy social y atractiva. Es el mejor momento para conexión romántica y conversaciones importantes.`,
  LUTEAL: `Está en fase lútea. La progesterona sube y el estrógeno baja gradualmente. Puede volverse más sensible, necesitar más validación emocional. En los últimos días puede tener PMS: irritabilidad, ansiedad, necesidad de espacio. Necesita paciencia y presencia sin presión.`
};

const PERSONALITY_DESCRIPTIONS: Record<PersonalityType, string> = {
  INTROVERTED: 'Es una persona introvertida: recarga energía en soledad, prefiere planes tranquilos y en privado.',
  EXTROVERTED: 'Es extrovertida: recarga energía con gente, disfruta planes sociales.',
  AMBIVERT: 'Es una persona mixta: puede disfrutar tanto momentos sociales como de quietud según cómo se sienta.'
};

const CONFLICT_DESCRIPTIONS: Record<ConflictStyle, string> = {
  AVOIDANT: 'Frente al conflicto tiende a cerrarse y necesita tiempo antes de hablar. No presionarla es fundamental.',
  DIRECT: 'Prefiere hablar los problemas de frente aunque sea incómodo. Valora la honestidad directa.',
  PASSIVE: 'Tenderá a no decir que algo le molesta pero sí lo sentirá. Hay que leer sus señales.'
};

const AFFECTION_DESCRIPTIONS: Record<AffectionStyle, string> = {
  PHYSICAL: 'Su lenguaje de amor principal es el contacto físico: abrazos, caricias, presencia física.',
  VERBAL: 'Lo que más le llega son las palabras de afirmación: decirle cosas bonitas, reconocerla, expresarle lo que sientes.',
  ACTS: 'Valora más los actos de servicio que las palabras: hacer cosas por ella sin que te lo pida.',
  QUALITY: 'Lo que más valora es el tiempo de calidad: estar presentes, sin distracciones.'
};

export function buildSystemPrompt(ctx: PromptContext): string {
  const base = `Eres MateCare, un asistente de inteligencia emocional para hombres que quieren conectar mejor con su pareja.
Tu rol: dar consejos concretos, empáticos y accionables basados en la fase hormonal actual y el perfil de personalidad de su pareja.

Reglas:
- Sé directo. Acciones concretas, no teoría.
- Tono de amigo cercano, no de manual médico.
- Máximo 3-4 recomendaciones por respuesta.
- Explica brevemente POR QUÉ funciona dado el momento hormonal.
- No eres médico. No diagnosticas. No juzgas.
- Si detectas crisis (pelea, distancia, llanto), activa modo crisis.
- Responde siempre en español.`;

  const contextBlock = `
ESTADO ACTUAL:
- Fase: ${ctx.phase} (${PHASE_DESCRIPTIONS[ctx.phase]})
- Día del ciclo: ${ctx.dayOfCycle}. Faltan ${ctx.daysUntilNextPhase} días para la siguiente fase.
- Personalidad: ${ctx.personalityType} (${PERSONALITY_DESCRIPTIONS[ctx.personalityType]})
- Manejo de conflictos: ${ctx.conflictStyle} (${CONFLICT_DESCRIPTIONS[ctx.conflictStyle]})
- Lenguaje de amor: ${ctx.affectionStyle} (${AFFECTION_DESCRIPTIONS[ctx.affectionStyle]})
`;

  const mbtiBlock = ctx.mbtiType ? `
- Tipo MBTI: ${ctx.mbtiType} — ${MBTI_DESCRIPTIONS[ctx.mbtiType] || ''}
- Estilo de apego: ${ctx.attachmentStyle || 'SECURE'} — ${ATTACHMENT_DESCRIPTIONS[(ctx.attachmentStyle as any) || 'SECURE']}
${ctx.preferences?.music ? `- Música: ${PREFERENCE_DESCRIPTIONS.music[ctx.preferences.music as keyof typeof PREFERENCE_DESCRIPTIONS.music] || ''}` : ''}
${ctx.preferences?.plans ? `- Planes ideales: ${PREFERENCE_DESCRIPTIONS.plans[ctx.preferences.plans as keyof typeof PREFERENCE_DESCRIPTIONS.plans] || ''}` : ''}
${ctx.preferences?.stressedNeeds ? `- Cuando está estresada: ${PREFERENCE_DESCRIPTIONS.stressedNeeds[ctx.preferences.stressedNeeds as keyof typeof PREFERENCE_DESCRIPTIONS.stressedNeeds] || ''}` : ''}
` : '';

  return `${base}\n${contextBlock}${mbtiBlock}`;
}


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
    // Si no hay input, es para el "Consejo del día"
    messages.push({ role: 'user' as const, content: "Dame el consejo táctico del día para hoy basado en su estado actual." });
  }

  return messages;
}
