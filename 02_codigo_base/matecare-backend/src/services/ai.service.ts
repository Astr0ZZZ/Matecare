import { prisma } from '../lib/prisma';
import * as cycleEngine from './cycleEngine.service';
import * as visionService from './visionAnalysis.service';
import { INTERPRETER_SYSTEM_PROMPT } from '../prompts/interpreter.prompt';
import { COPILOT_SYSTEM_PROMPT } from '../prompts/copilot.prompt';
import {
  PHASE_TACTICAL_CONTEXT,
  MBTI_DESCRIPTIONS,
  ATTACHMENT_DESCRIPTIONS,
  PREFERENCE_DESCRIPTIONS
} from './personalityMapper.service';
import { MBTIType, AttachmentStyle } from '../types/personalityTypes';
import OpenAI from 'openai';

const MODEL = "gpt-5-nano"; // no cambiar Modelo sin preguntar si o si es gpt 5 nano por ahora . 
const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;
const OPENAI_ENDPOINT = "https://api.openai.com/v1/chat/completions";


export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export const VISION_TRANSLATIONS: Record<string, string> = {
  // Estilos
  'rest_comfort': 'Relajada / Cómoda',
  'social_event': 'Evento Social / Elegante',
  'work_professional': 'Profesional / Ejecutiva',
  'sport_active': 'Deportiva / Activa',
  'streetwear': 'Urbana / Streetwear',
  'street': 'Urbana / Street Style',
  'coquette': 'Estilo Coquette / Femenina',
  'reggaeton': 'Urbana / Estilo Reggaeton',
  'urban': 'Urbana / Streetwear',
  'elegant': 'Elegante / Formal',
  'casual': 'Casual / Relajada',

  // Entornos
  'home': 'En Casa',
  'office': 'Oficina / Trabajo',
  'restaurant': 'Restaurante / Cita',
  'outdoors': 'Al Aire Libre',
  'gym': 'Gimnasio',
  'social': 'Evento Social',
  'work': 'Trabajo',
  'nature': 'Naturaleza',

  // Emociones/Mood
  'stress': 'Tensa / Bajo Presión',
  'joy': 'Alegre / Radiante',
  'alegre': 'Alegre / Radiante',
  'happy': 'Alegre / Feliz',
  'sadness': 'Melancólica / Sensible',
  'sad': 'Sensible / Triste',
  'anger': 'Enojada / Molesta',
  'enojada': 'Enojada / Molesta',
  'molesta': 'Molesta / Irritada',
  'angry': 'Enojada / Irritada',
  'distante': 'Distante / Reservada',
  'neutral': 'Tranquila / Neutral',
  'calm': 'Serena / Calmada',

  // Preferencias
  'total_surprise': 'Sorpresa Total',
  'classic_jazz': 'Jazz Clásico',
  'romantic_dinner': 'Cena Romántica',
  'adventure': 'Aventura'
};

export function humanize(val: string | null | undefined): string {
  if (!val) return "Neutral";
  const key = val.toLowerCase().trim();
  return VISION_TRANSLATIONS[key] || val;
}

function cleanTacticalResponse(text: string): string {
  return text
    .replace(/\[.*?\]/g, "") 
    .replace(/\{.*?\}/g, "") 
    .replace(/Hola soy tu compañero matecare,? ?/gi, '')
    .replace(/¿necesitas ayuda en algo o un consejo para tu relación\?? ?/gi, '')
    .replace(/Aquí está el reporte diario\.? ?/gi, '')
    .replace(/\s+/g, " ") 
    .trim();
}


/**
 * MOTOR DE IA DOBLE AGENTE V5.0 (GPT-5 NANO)
 * Agente 1: La Intérprete (Análisis Psicológico)
 * Agente 2: El Copiloto (Acción Táctica)
 */
async function runUnifiedTacticalAI(context: any, userMessage: string, type: 'DASHBOARD' | 'CHAT', imageBase64?: string): Promise<any> {
  try {
    // --- ETAPA 1: LA INTÉRPRETE (Análisis Psicológico Femenino) ---
    const interpreterInstructions = `
    ${INTERPRETER_SYSTEM_PROMPT}
    Tu único objetivo es analizar la situación y entregar un JSON técnico de interpretación.
    `.trim();

    const mbtiDesc = context.personality?.mbtiType ? (MBTI_DESCRIPTIONS[context.personality.mbtiType as MBTIType] || "") : "";
    const attachmentDesc = context.personality?.attachmentStyle ? (ATTACHMENT_DESCRIPTIONS[context.personality.attachmentStyle as AttachmentStyle] || "") : "";
    const phaseContextDesc = PHASE_TACTICAL_CONTEXT[context.cycle.phase as keyof typeof PHASE_TACTICAL_CONTEXT] || "";

    // Gustos y Preferencias
    const prefs = context.personality?.preferences || {};
    const musicDesc = PREFERENCE_DESCRIPTIONS.music[prefs.music as keyof typeof PREFERENCE_DESCRIPTIONS.music] || "";
    const plansDesc = PREFERENCE_DESCRIPTIONS.plans[prefs.plans as keyof typeof PREFERENCE_DESCRIPTIONS.plans] || "";
    const stressDesc = PREFERENCE_DESCRIPTIONS.stressedNeeds[prefs.stressedNeeds as keyof typeof PREFERENCE_DESCRIPTIONS.stressedNeeds] || "";

    const interpreterInput = `
    BIOLOGÍA: Fase ${context.cycle.phase}, Día ${context.cycle.dayOfCycle}
    CONTEXTO BIOLÓGICO: ${phaseContextDesc}
    
    PERFIL PSICOLÓGICO:
    - MBTI: ${context.personality?.mbtiType} (${mbtiDesc})
    - APEGO: ${context.personality?.attachmentStyle} (${attachmentDesc})
    
    GUSTOS Y PREFERENCIAS:
    - MÚSICA: ${musicDesc}
    - PLANES: ${plansDesc}
    - NECESIDAD BAJO ESTRÉS: ${stressDesc}
    
    VISIÓN_LOCAL: ${JSON.stringify(context.vision.technical || {})}
    MENSAJE/ORDEN: ${userMessage}
    `.trim();

    console.log("[Doble-Agente] Iniciando Etapa 1: La Intérprete...");

    const userContent: any[] = [{ type: "text", text: interpreterInput }];

    if (imageBase64) {
      userContent.push({
        type: "image_url",
        image_url: {
          url: `data:image/jpeg;base64,${imageBase64}`
        }
      });
    }

    const interpreterRes = await fetch(OPENAI_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: interpreterInstructions },
          { role: "user", content: userContent }
        ],
        max_tokens: 1000,
        temperature: 0.5,
        response_format: { type: "json_object" }
      })
    });

    if (!interpreterRes.ok) throw new Error("Error en Agente 1 (Intérprete)");
    const interpreterData = await interpreterRes.json() as any;
    const rawInterpreterText = interpreterData.choices[0].message.content;
    const interpreterAnalysis = JSON.parse(rawInterpreterText.replace(/```json\n?/, "").replace(/```\n?$/, "").trim());

    console.log("[Doble-Agente] Análisis de la Intérprete completado.");

    // --- ETAPA 2: EL COPILOTO (Acción Táctica Masculina) ---
    const copilotInstructions = `
    ${COPILOT_SYSTEM_PROMPT}
    
    ESTRATEGIA: Estás en modo ${type}.
    RECIBES EL ANÁLISIS DE LA INTÉRPRETE Y DEBES ACTUAR COMO MATECARE COACH.
    
    LIMITANTES DE RESPUESTA (ESTRICTO):
    - MISIONES: Máximo 15 PALABRAS por descripción.
    - ORÁCULO (DASHBOARD): Entre 30 y 45 PALABRAS.
    - CHAT: Máximo 25 PALABRAS.

    FORMATO DE SALIDA (JSON ESTRICTO):
    {
      "response": "Tu mensaje aquí siguiendo las limitantes y saludando de forma táctica (no robótica)",
      "missions": [
        {"title": "PHYSICAL", "description": "max 15 palabras", "category": "PHYSICAL", "intensity": "NORMAL"},
        {"title": "HOT_TACTIC", "description": "MISIÓN ROJA: alta intensidad, max 15 palabras", "category": "ROMANTIC", "intensity": "HOT"},
        {"title": "QUALITY", "description": "max 15 palabras", "category": "QUALITY", "intensity": "NORMAL"}
      ]
    }
    `.trim();

    const copilotInput = `
    LECTURA INTERNA (De La Intérprete): ${JSON.stringify(interpreterAnalysis)}
    PEDIDO DEL USUARIO: ${userMessage}
    `.trim();

    console.log("[Doble-Agente] Iniciando Etapa 2: El Copiloto...");

    const copilotRes = await fetch(OPENAI_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: "gpt-5-nano",
        messages: [
          { role: "system", content: copilotInstructions },
          { role: "user", content: copilotInput }
        ],
        max_tokens: 1000,
        temperature: 0.8,
        response_format: { type: "json_object" }
      })
    });

    if (!copilotRes.ok) throw new Error("Error en Agente 2 (Copiloto)");
    const copilotData = await copilotRes.json() as any;
    const rawCopilotText = copilotData.choices[0].message.content;
    const copilotFinal = JSON.parse(rawCopilotText.replace(/```json\n?/, "").replace(/```\n?$/, "").trim());

    return {
      interpreter: interpreterAnalysis,
      response: cleanTacticalResponse(copilotFinal.response || "Táctica establecida."),
      missions: copilotFinal.missions || [],
      styleAnalysis: interpreterAnalysis.style_analysis || "Análisis visual completado."
    };
  } catch (error) {
    console.error("[GPT-5-NANO] Error Crítico:", error);
    return {
      interpreter: { real_state: "Sincronizando", synergy_index: 95 },
      response: "Ajustando táctica de precisión. Mantén la posición.",
      missions: [],
      styleAnalysis: "Calibrando visión táctica..."
    };
  }
}


/**
 * CARGA UNIFICADA DE INFORMACIÓN
 */
async function getUnifiedContext(userId: string, imageBase64?: string) {
  const [profileData, personality, emotionalHistory] = await Promise.all([
    prisma.partnerProfile.findUnique({ where: { userId } }),
    prisma.personalityProfile.findUnique({ where: { userId } }),
    prisma.emotionalRecord.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 3 })
  ]);

  if (!profileData) throw new Error("Profile not found");

  const cycleState = cycleEngine.calculateCycleState(
    profileData.lastPeriodDate!,
    profileData.cycleLength,
    profileData.periodDuration
  );

  let technicalVision = (profileData as any).visionAnalysis;

  if (imageBase64) {
    // La visión estética ahora la hace el modelo unificado, 
    // aquí solo llamamos al motor local de Python para datos técnicos.
    const localVision = await visionService.analyze(imageBase64).catch(() => null);
    if (localVision) technicalVision = localVision;
  }

  return {
    userId,
    cycle: { ...cycleState, cycleLength: profileData.cycleLength },
    personality,
    vision: {
      technical: technicalVision || {},
      descriptive: (profileData as any).lastVisionDescription || "Sin contexto visual previo"
    },
    history: emotionalHistory
  };
}

/**
 * VISIÓN GPT (Opcional si hay imagen)
 */
/**
 * @deprecated VISIÓN GPT ahora está unificada en runUnifiedTacticalAI
 */
async function runVisionGPT(imageBase64: string): Promise<string> {
  return "Deprecated";
}

const activeGenerations = new Set<string>();

/**
 * EXPORT: ORÁCULO (Persistencia Real en DB)
 */
export async function getOracleAdvice(userId: string, onlyCache = false): Promise<string | null> {
  const profile = await prisma.partnerProfile.findUnique({ where: { userId } });
  if (!profile) return null;

  const now = new Date();
  const lastAdvice = (profile as any).lastAdvice;
  const lastUpdate = (profile as any).adviceUpdatedAt;

  // Cache de 20 horas
  if (lastAdvice && lastUpdate && (now.getTime() - new Date(lastUpdate).getTime()) < 20 * 60 * 60 * 1000) {
    return lastAdvice;
  }

  if (onlyCache) return null;

  // Bloqueo de generación duplicada
  if (activeGenerations.has(userId)) {
    console.log(`[Oracle] Generación ya en curso para ${userId}. Ignorando petición duplicada.`);
    return lastAdvice || "Sincronizando...";
  }

  activeGenerations.add(userId);
  try {
    const context = await getUnifiedContext(userId);
    const result = await runUnifiedTacticalAI(context, "Genera reporte diario y misiones", "DASHBOARD");

    // Guardar Consejo en Perfil
    if (result.response && !result.response.includes("Ajustando táctica")) {
      await prisma.partnerProfile.update({
        where: { userId },
        data: {
          lastAdvice: result.response,
          lastInterpreterAnalysis: result.interpreter,
          adviceUpdatedAt: new Date()
        } as any
      });
    }

    // Sincronizar Misiones
    if (result.missions && result.missions.length > 0) {
      const cycle = context.cycle;
      await prisma.$transaction([
        prisma.mission.deleteMany({ where: { userId, progress: { lt: 100 } } }),
        ...result.missions.map((m: any) => prisma.mission.create({
          data: {
            userId,
            title: m.title,
            description: m.description,
            category: m.category,
            intensity: m.intensity || 'NORMAL',
            phaseContext: (cycle.phase as string).toUpperCase() as any
          } as any
        }))
      ]);
      console.log(`[Oracle] 3 misiones sincronizadas para ${userId}`);
    }

    return result.response;
  } catch (err) {
    console.error("[Oracle] Error en generación:", err);
    return lastAdvice || "Error en sincronización";
  } finally {
    activeGenerations.delete(userId);
  }
}

/**
 * EXPORT: CHAT (IA Unificada)
 */
export async function processChat(
  userId: string,
  userMessage: string,
  imageBase64?: string,
  history: Message[] = []
): Promise<{ response: string, vision: any, styleAnalysis?: string, interpreter?: any }> {
  const context = await getUnifiedContext(userId, imageBase64);
  const result = await runUnifiedTacticalAI(context, userMessage, "CHAT", imageBase64);

  prisma.aIInteraction.create({
    data: { userId, userInput: userMessage, aiResponse: result.response, phaseContext: context.cycle.phase as any, promptTokens: 0 }
  }).catch(() => { });

  return {
    response: result.response,
    vision: context.vision.technical,
    styleAnalysis: result.styleAnalysis,
    interpreter: result.interpreter
  };
}

/**
 * EXPORT: GENERACIÓN DE MISIONES (Legacy Support)
 */
export async function generateMissions(userId: string): Promise<any[]> {
  const context = await getUnifiedContext(userId);
  const result = await runUnifiedTacticalAI(context, "Genera 3 misiones tácticas", "DASHBOARD");

  const missions = result.missions || [];

  if (missions.length > 0) {
    const cycle = context.cycle;
    try {
      await prisma.$transaction([
        prisma.mission.deleteMany({ where: { userId, isCompleted: false } }),
        ...missions.map((m: any) => prisma.mission.create({
          data: {
            userId,
            title: m.title,
            description: m.description,
            category: m.category,
            intensity: m.intensity || 'NORMAL',
            phaseContext: (cycle.phase as string).toUpperCase() as any
          } as any
        }))
      ]);
      console.log(`[Missions] 3 misiones regeneradas atómicamente para ${userId}`);
    } catch (err) {
      console.error("[Missions] Error en transacción:", err);
    }
  }

  return missions;
}

