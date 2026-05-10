import { prisma } from '../lib/prisma';
import * as cycleEngine from './cycleEngine.service';
import * as visionService from './visionAnalysis.service';
import { INTERPRETER_SYSTEM_PROMPT } from '../prompts/interpreter.prompt';
import { COPILOT_SYSTEM_PROMPT } from '../prompts/copilot.prompt';
import { PHASE_TACTICAL_CONTEXT } from './personalityMapper.service';
import OpenAI from 'openai';

const MODEL = "gpt-5-nano";
// Usaremos fetch directamente para la nueva Responses API por ser un estándar emergente
const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;
const OPENAI_ENDPOINT = "https://api.openai.com/v1/responses";


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
    .replace(/\[.*?\]/g, "") // Elimina cualquier cosa entre corchetes
    .replace(/\{.*?\}/g, "") // Elimina cualquier cosa entre llaves
    .replace(/^[a-zA-ZÀ-ÿ\s\.\·]+:\s*/, "") // Elimina etiquetas iniciales tipo "Fase:", "ENTORNO:", etc.
    .replace(/\s+/g, " ") // Normaliza espacios
    .trim();
}


/**
 * MOTOR DE IA UNIFICADO V5.0 (OPENAI RESPONSES API)
 * Una sola llamada atómica para visión, contexto y respuesta.
 */
async function runUnifiedTacticalAI(context: any, userMessage: string, type: 'DASHBOARD' | 'CHAT', imageBase64?: string): Promise<any> {
  const instructions = `
  ${INTERPRETER_SYSTEM_PROMPT}
  ${COPILOT_SYSTEM_PROMPT}
  
  ESTRATEGIA: Estás en modo ${type}.
  Si es DASHBOARD: Genera reporte interno, consejo del día y 3 misiones.
  Si es CHAT: Responde al mensaje del usuario usando el reporte interno.
  
  FORMATO DE SALIDA (JSON ESTRICTO):
  {
    "interpreter": { "real_state": "...", "sexual_mood": "...", "hidden_need": "...", "risk_flag": "...", "tactical_note": "...", "style_analysis": "...", "synergy_index": 0-100 },
    "response": "mensaje del coach (max 30 palabras)",
    "missions": [
      {"title": "PHYSICAL", "description": "...", "category": "PHYSICAL"},
      {"title": "ROMANTIC", "description": "...", "category": "ROMANTIC"},
      {"title": "QUALITY", "description": "...", "category": "QUALITY"}
    ]
  }
  `.trim();

  const userContextText = `
  BIOLOGÍA: Fase ${context.cycle.phase}, Día ${context.cycle.dayOfCycle}
  PERFIL: MBTI ${context.personality?.mbtiType}, Apego ${context.personality?.attachmentStyle}
  VISIÓN_LOCAL: ${JSON.stringify(context.vision.technical || {})}
  MENSAJE/ORDEN: ${userMessage}
  `.trim();

  try {
    const inputContent: any[] = [
      { type: "input_text", text: userContextText }
    ];

    if (imageBase64) {
      inputContent.unshift({
        type: "input_image",
        image_url: `data:image/jpeg;base64,${imageBase64}`,
        detail: "auto"
      });
    }

    const res = await fetch(OPENAI_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: MODEL,
        instructions: instructions,
        input: [
          {
            role: "user",
            content: inputContent
          }
        ],
        max_output_tokens: 1000,
        temperature: 0.7
      })
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(`OpenAI API Error: ${JSON.stringify(errorData)}`);
    }

    const data = await res.json() as any;
    
    // Parser para la Responses API
    const rawText = data.output
      .flatMap((o: any) => o.content)
      .filter((c: any) => c.type === "output_text")
      .map((c: any) => c.text)
      .join("");

    const parsed = JSON.parse(rawText);
    
    return {
      ...parsed,
      response: cleanTacticalResponse(parsed.response || "")
    };

  } catch (e) {
    console.error("[Unified-AI] Error crítico:", e);
    return {
      interpreter: { real_state: "Sincronizando", synergy_index: 90 },
      response: "Ajustando táctica. Mantén la posición.",
      missions: []
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
      descriptive: "Integrado en llamada unificada"
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

/**
 * EXPORT: ORÁCULO (Persistencia Real en DB)
 */
export async function getOracleAdvice(userId: string, onlyCache = false): Promise<string | null> {
  const profile = await prisma.partnerProfile.findUnique({ where: { userId } });
  if (!profile) return null;

  const now = new Date();
  const lastAdvice = (profile as any).lastAdvice;
  const lastUpdate = (profile as any).adviceUpdatedAt;

  if (lastAdvice && lastUpdate && (now.getTime() - new Date(lastUpdate).getTime()) < 20 * 60 * 60 * 1000) {
    return lastAdvice;
  }

  if (onlyCache) return null;

  const context = await getUnifiedContext(userId);
  const result = await runUnifiedTacticalAI(context, "Genera reporte diario y misiones", "DASHBOARD");

  // Guardar Consejo en Perfil
  prisma.partnerProfile.update({
    where: { userId },
    data: { lastAdvice: result.response, adviceUpdatedAt: new Date() } as any
  }).catch(() => {});

  // Guardar Misiones en DB
  if (result.missions && result.missions.length > 0) {
    const cycle = context.cycle;
    Promise.all(result.missions.map((m: any) => prisma.mission.create({
      data: {
        userId,
        title: m.title,
        description: m.description,
        category: m.category,
        phaseContext: (cycle.phase as string).toUpperCase() as any
      }
    }))).catch(() => {});
  }

  return result.response;
}

/**
 * EXPORT: CHAT (IA Unificada)
 */
export async function processChat(
  userId: string,
  userMessage: string,
  imageBase64?: string,
  history: Message[] = []
): Promise<{ response: string, vision: any }> {
  const context = await getUnifiedContext(userId, imageBase64);
  const result = await runUnifiedTacticalAI(context, userMessage, "CHAT", imageBase64);
  
  prisma.aIInteraction.create({
    data: { userId, userInput: userMessage, aiResponse: result.response, phaseContext: context.cycle.phase as any, promptTokens: 0 }
  }).catch(() => {});

  return { response: result.response, vision: context.vision.technical };
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
    await Promise.all(missions.map((m: any) => prisma.mission.create({
      data: {
        userId,
        title: m.title,
        description: m.description,
        category: m.category,
        phaseContext: (cycle.phase as string).toUpperCase() as any
      }
    }))).catch(() => {});
  }

  return missions;
}

