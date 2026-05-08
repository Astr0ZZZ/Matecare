import { prisma } from '../lib/prisma';
import * as cycleEngine from './cycleEngine.service';
import * as visionService from './visionAnalysis.service';
import { INTERPRETER_SYSTEM_PROMPT } from '../prompts/interpreter.prompt';
import { COPILOT_SYSTEM_PROMPT } from '../prompts/copilot.prompt';
import { PHASE_TACTICAL_CONTEXT } from './personalityMapper.service';
import OpenAI from 'openai';
import { VisionContext } from '../types/vision';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export interface SubtextReport {
  real_state: string;
  hidden_need: string;
  risk_flag: "ninguno" | "conflicto_latente" | "agotamiento" | "necesita_espacio" | "crisis";
  tactical_note: string;
  synergy_index: number;
  unspoken_friction: "bajo" | "medio" | "alto";
}

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

async function runInterpreter(
  cycleData: any,
  profile: any,
  vision: VisionContext | null,
  emotionalHistory: any[] = []
): Promise<SubtextReport> {
  
  const historySummary = emotionalHistory.length > 0 
    ? emotionalHistory.map(r => `- ${r.createdAt.toISOString().split('T')[0]}: ${r.dominantEmotion} (Autenticidad: ${r.authenticityLabel})`).join('\n')
    : 'Sin historial reciente.';

  const userContent = `
FASE: ${cycleData.phase} — Día ${cycleData.dayOfCycle} de ${cycleData.cycleLength || 28}
MBTI: ${profile.mbtiType} | APEGO: ${profile.attachmentStyle} | AMOR: ${profile.preferences?.loveLanguage || 'No especificado'}

HISTORIAL EMOCIONAL RECIENTE:
${historySummary}

${vision ? `
VISIÓN ACTUAL:
- Tono emocional: ${vision.emotional_tone}
- Energía social: ${vision.social_energy}
- Fatiga: ${vision.fatigue_signal}
- Entorno: ${vision.environment_context}
- Supresión detectada: ${vision.suppression_detected}
- Discrepancia visual: ${vision.visual_discrepancy}
- Color mood: ${vision.color_mood}
` : 'VISIÓN ACTUAL: no disponible'}
`.trim();

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: INTERPRETER_SYSTEM_PROMPT },
      { role: "user",   content: userContent }
    ],
    response_format: { type: "json_object" },
    max_tokens: 300,
    temperature: 0.4
  });

  const content = response.choices[0].message.content;
  if (!content) throw new Error("Interpreter returned empty response");
  
  return JSON.parse(content) as SubtextReport;
}

async function runCopilot(
  subtextReport: SubtextReport,
  userMessage: string,
  cyclePhase: string,
  chatHistory: Message[]
): Promise<string> {

  const tacticalContext = PHASE_TACTICAL_CONTEXT[cyclePhase as keyof typeof PHASE_TACTICAL_CONTEXT] || '';

  const systemWithContext = `
${COPILOT_SYSTEM_PROMPT}

LECTURA INTERNA (del análisis de La Intérprete):
- Estado real: ${subtextReport.real_state}
- Necesidad oculta: ${subtextReport.hidden_need}
- Flag de riesgo: ${subtextReport.risk_flag}
- Nota táctica: ${subtextReport.tactical_note}
- Sinergia (TSI): ${subtextReport.synergy_index}/100
- Fricción latente: ${subtextReport.unspoken_friction}
- Fase activa: ${cyclePhase}

CONTEXTO TÁCTICO DE LA FASE:
${tacticalContext}
`.trim();

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemWithContext },
      ...chatHistory.slice(-6),
      { role: "user", content: userMessage }
    ],
    max_tokens: 150,
    temperature: 0.7
  });

  return response.choices[0].message.content || "Error procesando respuesta táctica.";
}

export async function processChat(
  userId: string,
  userMessage: string,
  imageBase64?: string,
  history: Message[] = []
): Promise<string> {

  // 1. Datos paralelos
  const profileData = await prisma.partnerProfile.findUnique({ where: { userId } });
  if (!profileData) throw new Error("Partner profile not found");

  const [cycleState, personalityProfile, vision, emotionalHistory] = await Promise.all([
    cycleEngine.calculateCycleState(profileData.lastPeriodDate!, profileData.cycleLength, profileData.periodDuration),
    prisma.personalityProfile.findUnique({ where: { userId } }),
    imageBase64 
      ? Promise.race([
          visionService.analyze(imageBase64),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 1200)) // Un poco más de tiempo para el pipeline v3.0
        ]).catch(() => null) 
      : Promise.resolve(null),
    prisma.emotionalRecord.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 3
    })
  ]);

  const cycleData = { ...cycleState, cycleLength: profileData.cycleLength };

  // 2. Crisis detection rápida (sin IA)
  const crisisKeywords = ["terminar", "llorar", "pelea", "enojada", "separar", "ya no"];
  const isCrisis = crisisKeywords.some(k => userMessage.toLowerCase().includes(k));

  // 3. Agente 1: La Intérprete
  const subtextReport = await runInterpreter(cycleData, personalityProfile, vision, emotionalHistory);
  
  // Override si crisis detectada por keywords
  if (isCrisis && subtextReport.risk_flag === "ninguno") {
    subtextReport.risk_flag = "crisis";
  }

  // 4. Agente 2: El Copiloto
  const finalResponse = await runCopilot(subtextReport, userMessage, cycleData.phase, history);

  // Guardar mensaje en historial de AIInteraction (opcional, pero recomendado)
  await prisma.aIInteraction.create({
    data: {
      userId,
      userInput: userMessage,
      aiResponse: finalResponse,
      phaseContext: cycleData.phase,
      promptTokens: 0 // Placeholder
    }
  }).catch(() => {});

  return finalResponse;
}
