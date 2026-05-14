import { prisma } from '../lib/prisma';
import * as cycleEngine from './cycleEngine.service';
import * as visionService from './visionAnalysis.service';
import { INTERPRETER_SYSTEM_PROMPT } from '../prompts/interpreter.prompt';
import { COPILOT_SYSTEM_PROMPT } from '../prompts/copilot.prompt';
import { ROUTER_SYSTEM_PROMPT } from '../prompts/router.prompt';
import {
  PHASE_TACTICAL_CONTEXT,
  MBTI_DESCRIPTIONS,
  ATTACHMENT_DESCRIPTIONS,
  PREFERENCE_DESCRIPTIONS
} from './personalityMapper.service';
import { MBTIType, AttachmentStyle } from '../types/personalityTypes';
import OpenAI from 'openai';

const MODEL = "gpt-5-nano"; // 
const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;
const OPENAI_ENDPOINT = "https://api.openai.com/v1/chat/completions";

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });


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
    .replace(/A sus órdenes\.? ?/gi, '')
    .replace(/Calibrando táctica\.{0,3} ?/gi, '')
    .replace(/Escucha esto:? ?/gi, '')
    .replace(/Atención:? ?/gi, '')
    .replace(/Coach aquí\.? ?/gi, '')
    .replace(/^\s*[.,;:]\s*/, '')
    .replace(/\s+/g, " ")
    .trim();
}

function extractJSON(text: string): any {
  try {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    return JSON.parse(text);
  } catch (e) {
    console.error("JSON parse error on:", text);
    throw e;
  }
}


/**
 * MOTOR DE IA DOBLE AGENTE V5.0 (GPT-5 NANO)
 * Agente 1: La Intérprete (Análisis Psicológico)
 * Agente 2: El Copiloto (Acción Táctica)
 */
async function runUnifiedTacticalAI(context: any, userMessage: string, type: 'DASHBOARD' | 'CHAT', imageBase64?: string, history: Message[] = []): Promise<any> {
  try {
    // --- ETAPA 1: LA INTÉRPRETE (Análisis Psicológico de la NOVIA) ---
    const interpreterInstructions = `
    ${INTERPRETER_SYSTEM_PROMPT}
    Analiza los datos de LA NOVIA y entrega un JSON técnico para El Copiloto.
    `.trim();

    const mbtiDesc = context.personality?.mbtiType ? (MBTI_DESCRIPTIONS[context.personality.mbtiType as MBTIType] || "") : "";
    const attachmentDesc = context.personality?.attachmentStyle ? (ATTACHMENT_DESCRIPTIONS[context.personality.attachmentStyle as AttachmentStyle] || "") : "";
    const phaseContextDesc = PHASE_TACTICAL_CONTEXT[context.cycle.phase as keyof typeof PHASE_TACTICAL_CONTEXT] || "";

    // Gustos y Preferencias de ELLA
    const prefs = context.personality?.preferences || {};
    const musicDesc = PREFERENCE_DESCRIPTIONS.music[prefs.music as keyof typeof PREFERENCE_DESCRIPTIONS.music] || "";
    const plansDesc = PREFERENCE_DESCRIPTIONS.plans[prefs.plans as keyof typeof PREFERENCE_DESCRIPTIONS.plans] || "";
    const stressDesc = PREFERENCE_DESCRIPTIONS.stressedNeeds[prefs.stressedNeeds as keyof typeof PREFERENCE_DESCRIPTIONS.stressedNeeds] || "";

    const interpreterInput = `
    === DATOS DE LA NOVIA (la pareja del usuario) ===
    CICLO DE ELLA: Fase ${context.cycle.phase}, Día ${context.cycle.dayOfCycle}
    CONTEXTO BIOLÓGICO DE ELLA: ${phaseContextDesc}
    
    PERFIL PSICOLÓGICO DE ELLA:
    - MBTI de ella: ${context.personality?.mbtiType} (${mbtiDesc})
    - Estilo de apego de ella: ${context.personality?.attachmentStyle} (${attachmentDesc})
    
    GUSTOS DE ELLA:
    - Música que le gusta: ${musicDesc}
    - Planes que prefiere: ${plansDesc}
    - Lo que necesita bajo estrés: ${stressDesc}
    
    DATOS VISUALES DE ELLA: ${JSON.stringify(context.vision.technical || {})}
    
    === PEDIDO DEL NOVIO (el usuario) ===
    ${userMessage}
    `.trim();

    console.log("[Doble-Agente] Iniciando Etapa 1: La Intérprete...");

    const userContent: any[] = [{ type: "text", text: interpreterInput }];

    if (imageBase64) {
      const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
      userContent.push({
        type: "image_url",
        image_url: {
          url: `data:image/jpeg;base64,${cleanBase64}`
        }
      });
    }

    const interpreterRes = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: interpreterInstructions },
        { role: "user", content: userContent }
      ],
      response_format: { type: "json_object" }
    });

    const rawInterpreterText = interpreterRes.choices[0].message.content;
    console.log("[Agente1] finish_reason:", interpreterRes.choices[0].finish_reason, "content length:", rawInterpreterText?.length || 0);
    if (!rawInterpreterText) throw new Error("Agente 1 devolvió content null. finish_reason: " + interpreterRes.choices[0].finish_reason);
    const interpreterAnalysis = extractJSON(rawInterpreterText);

    console.log("[Doble-Agente] Análisis de la Intérprete completado.");

    // --- ETAPA 2: EL COPILOTO (Coach del NOVIO) ---
    const copilotInstructions = `
    ${COPILOT_SYSTEM_PROMPT}
    
    MODO ACTUAL: ${type}
    Recuerdas: tú le hablas al NOVIO (usuario). La Intérprete te da info sobre la NOVIA.
    
    LIMITANTES DE RESPUESTA (ESTRICTO):
    - Cada "description" de misión: MÁXIMO 12 PALABRAS. Son acciones que ÉL (novio) hace para ELLA.
    - Si mode=DASHBOARD: "response" = consejo para el NOVIO de MÁXIMO 40 PALABRAS. SIN saludos. Ve DIRECTO.
    - Si mode=CHAT: "response" = MÁXIMO 25 PALABRAS. Una frase para el novio.

    FORMATO DE SALIDA (JSON ESTRICTO, sin texto fuera del JSON):
    {
      "response": "consejo directo para el novio sobre cómo actuar con ella",
      "missions": [
        {"title": "PHYSICAL", "description": "acción que ÉL hace para ELLA max 12 palabras", "category": "PHYSICAL", "intensity": "NORMAL"},
        {"title": "HOT_TACTIC", "description": "misión audaz que ÉL le hace a ELLA max 12 palabras", "category": "ROMANTIC", "intensity": "HOT"},
        {"title": "QUALITY", "description": "acción que ÉL hace para ELLA max 12 palabras", "category": "QUALITY", "intensity": "NORMAL"}
      ]
    }
    `.trim();

    const copilotInput = `
    EL NOVIO (usuario) dice: "${userMessage}"
    
    REPORTE DE LA INTÉRPRETE SOBRE LA NOVIA (usa esto para aconsejar al novio):
    ${JSON.stringify(interpreterAnalysis)}
    `.trim();

    console.log("[Doble-Agente] Iniciando Etapa 2: El Copiloto...");

    // Solo mantenemos los mensajes de texto del historial para no confundir al modelo con imágenes pasadas
    const cleanHistory = history.map(m => ({ role: m.role, content: m.content }));

    const copilotMessages: any[] = [
      { role: "system", content: copilotInstructions },
      ...cleanHistory,
      { role: "user", content: copilotInput }
    ];

    const copilotRes = await openai.chat.completions.create({
      model: MODEL,
      messages: copilotMessages,
      response_format: { type: "json_object" }
    });

    const rawCopilotText = copilotRes.choices[0].message.content;
    if (!rawCopilotText) throw new Error("Error en Agente 2 (Copiloto)");
    const copilotFinal = extractJSON(rawCopilotText);

    return {
      interpreter: interpreterAnalysis,
      response: cleanTacticalResponse(copilotFinal.response || "Táctica establecida."),
      missions: copilotFinal.missions || [],
      styleAnalysis: interpreterAnalysis.style_analysis || "Análisis visual completado."
    };
  } catch (error: any) {
    console.error("[GPT-5-NANO] Error Crítico:", error?.message || error);
    console.error("[GPT-5-NANO] Status:", error?.status, "Code:", error?.code);
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
      technical: technicalVision && Object.keys(technicalVision).length > 0 ? technicalVision : "Sin datos técnicos locales",
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
export async function getOracleAdvice(userId: string, onlyCache = false, forceRegenerate = false): Promise<string | null> {
  const profile = await prisma.partnerProfile.findUnique({ where: { userId } });
  if (!profile) return null;

  const now = new Date();
  const lastAdvice = (profile as any).lastAdvice;
  const lastUpdate = (profile as any).adviceUpdatedAt;

  // Cache de 20 horas (bypass con forceRegenerate)
  if (!forceRegenerate && lastAdvice && lastUpdate && (now.getTime() - new Date(lastUpdate).getTime()) < 20 * 60 * 60 * 1000) {
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
            intensity: ['HOT', 'HEAT', 'hot', 'heat'].includes(m.intensity) ? 'HOT' : 'NORMAL',
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
  const result = await runUnifiedTacticalAI(context, userMessage, "CHAT", imageBase64, history);

  prisma.aIInteraction.create({
    data: { userId, userInput: userMessage, aiResponse: result.response, phaseContext: context.cycle.phase as any, promptTokens: 0 }
  }).catch(() => { });

  if (result.interpreter) {
    await prisma.partnerProfile.update({
      where: { userId },
      data: {
        lastInterpreterAnalysis: result.interpreter,
        lastVisionDescription: result.styleAnalysis || undefined
      } as any
    }).catch(() => { });
  }

  return {
    response: result.response,
    vision: context.vision.technical,
    styleAnalysis: result.styleAnalysis,
    interpreter: result.interpreter
  };
}

/**
 * ═══════════════════════════════════════════════════════════
 * AGENTE 0: EL ROUTER (Clasificador de Intenciones)
 * Usa GPT-5 Nano para decidir si el mensaje es casual o táctico.
 * Más inteligente que regex: entiende contexto y mensajes mixtos.
 * ═══════════════════════════════════════════════════════════
 */
async function classifyIntent(userMessage: string): Promise<'CASUAL' | 'TACTICAL'> {
  try {
    const routerRes = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: ROUTER_SYSTEM_PROMPT },
        { role: "user", content: userMessage }
      ],
      response_format: { type: "json_object" }
    });

    const raw = routerRes.choices[0].message.content;
    if (!raw) return 'TACTICAL'; // fallback seguro
    const parsed = extractJSON(raw);
    const intent = parsed.intent?.toUpperCase() === 'CASUAL' ? 'CASUAL' : 'TACTICAL';
    console.log(`[Agente0-Router] Mensaje: "${userMessage}" → Clasificado: ${intent}`);
    return intent;
  } catch (error) {
    console.error("[Agente0-Router] Error en clasificación, defaulting a TACTICAL:", error);
    return 'TACTICAL'; // si falla, es mejor analizar de más
  }
}

export async function processChatStream(
  userId: string,
  userMessage: string,
  history: Message[],
  res: any  // Response de Express para escribir SSE
): Promise<{ response: string, interpreter: any }> {
  const context = await getUnifiedContext(userId);

  // ═══ AGENTE 0: EL ROUTER — Clasifica la intención del mensaje ═══
  res.write(`data: ${JSON.stringify({ status: "Procesando..." })}\n\n`);
  const intent = await classifyIntent(userMessage);
  console.log(`[Chat] Mensaje: "${userMessage}" | Intent: ${intent}`);

  let interpreterAnalysis: any = null;

  if (intent === 'TACTICAL') {
    // ═══ MODO TÁCTICO: Corre el Agente 1 (Intérprete) completo ═══
    const interpreterInstructions = `${INTERPRETER_SYSTEM_PROMPT}
    Analiza los datos de LA NOVIA y genera tu reporte JSON para El Copiloto.`.trim();

    const mbtiDesc = context.personality?.mbtiType ? (MBTI_DESCRIPTIONS[context.personality.mbtiType as MBTIType] || "") : "";
    const attachmentDesc = context.personality?.attachmentStyle ? (ATTACHMENT_DESCRIPTIONS[context.personality.attachmentStyle as AttachmentStyle] || "") : "";
    const phaseContextDesc = PHASE_TACTICAL_CONTEXT[context.cycle.phase as keyof typeof PHASE_TACTICAL_CONTEXT] || "";

    const interpreterInput = `
    === DATOS DE LA NOVIA ===
    CICLO DE ELLA: Fase ${context.cycle.phase}, Día ${context.cycle.dayOfCycle}
    CONTEXTO BIOLÓGICO DE ELLA: ${phaseContextDesc}
    PERFIL PSICOLÓGICO DE ELLA:
    - MBTI de ella: ${context.personality?.mbtiType} (${mbtiDesc})
    - Estilo de apego de ella: ${context.personality?.attachmentStyle} (${attachmentDesc})
    DATOS VISUALES DE ELLA: ${JSON.stringify(context.vision.technical || {})}
    
    === PEDIDO DEL NOVIO ===
    ${userMessage}
    `.trim();

    res.write(`data: ${JSON.stringify({ status: "Analizando situación táctica..." })}\n\n`);

    const interpreterRes = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: interpreterInstructions },
        { role: "user", content: interpreterInput }
      ],
      response_format: { type: "json_object" }
    });

    const rawInterpreterText = interpreterRes.choices[0].message.content;
    if (!rawInterpreterText) throw new Error("Agente 1 devolvió null");
    interpreterAnalysis = extractJSON(rawInterpreterText);
    console.log(`[Doble-Agente] Análisis de la Intérprete completado.`);
    console.log(`[DEBUG] Análisis Táctico (Stage 1):`, JSON.stringify(interpreterAnalysis).slice(0, 150) + "...");
  } else {
    console.log(`[Agente0-Router] Intent CASUAL → Saltando Intérprete. Solo Copiloto.`);
  }

  // ═══ AGENTE 2: EL COPILOTO (siempre corre) ═══
  res.write(`data: ${JSON.stringify({ status: intent === 'CASUAL' ? "Conectando..." : "Generando respuesta táctica..." })}\n\n`);

  const visionDesc = context.vision.descriptive || "No hay datos visuales recientes.";

  console.log(`[Doble-Agente] Iniciando Etapa 2: El Copiloto (habla con el NOVIO)...`);

  // Las instrucciones cambian según el modo
  let copilotInstructions: string;
  let copilotInput: string;

  if (intent === 'CASUAL') {
    // ═══ MODO CASUAL: El Copiloto habla como un amigo, sin data táctica pesada ═══
    copilotInstructions = `${COPILOT_SYSTEM_PROMPT}
MODO: CONVERSACIÓN CASUAL
El novio te está hablando de forma casual (saludando, preguntando algo general, etc.).
Respóndele como un amigo — con energía, calidez y personalidad.
Si te saluda, salúdalo de vuelta y pregúntale cómo le va o en qué lo puedes ayudar.
NO lances tácticas ni consejos sobre su novia a menos que él te lo pida.
Sé breve, natural y humano.
FORMATO: Texto plano, sin JSON, sin markdown. Máximo 25 palabras.`.trim();

    copilotInput = `EL NOVIO te dice: "${userMessage}"

Respóndele de forma natural y amigable. Es solo una conversación casual.`;
  } else {
    // ═══ MODO TÁCTICO: El Copiloto usa la inteligencia de la Intérprete ═══
    copilotInstructions = `${COPILOT_SYSTEM_PROMPT}
MODO: CHAT TÁCTICO
El novio te pide consejo o te cuenta una situación. Usa la inteligencia de La Intérprete para aconsejarle.
Recuerda: toda la info es sobre SU NOVIA. Tú le aconsejas a ÉL cómo actuar.
FORMATO: Texto plano, sin JSON, sin markdown. Máximo 35 palabras.`.trim();

    copilotInput = `EL NOVIO (tu usuario) te dice: "${userMessage}"

INTELIGENCIA SOBRE SU NOVIA (de La Intérprete, para que tú le aconsejes a él):
- Estado emocional de ella: ${interpreterAnalysis?.real_state || 'N/A'}
- Lo que ella necesita sin decirlo: ${interpreterAnalysis?.hidden_need || 'N/A'}
- Consejo táctico para el novio: ${interpreterAnalysis?.tactical_note || 'N/A'}
- Cómo se veía ella últimamente: ${visionDesc}

Responde al NOVIO directamente. Tú eres su coach, él es tu hermano.`;
  }

  // Solo pasamos historial limpio (últimos 4 mensajes para no contaminar)
  const cleanHistory = history.slice(-4);

  const copilotMessages: any[] = [
    { role: "system", content: copilotInstructions },
    ...cleanHistory,
    { role: "user", content: copilotInput }
  ];

  const stream = await openai.chat.completions.create({
    model: MODEL,
    messages: copilotMessages,
    stream: true
  });

  console.log(`[DEBUG] Stream de OpenAI iniciado. Transmitiendo tokens...`);
  let fullResponse = '';
  for await (const chunk of stream) {
    const token = chunk.choices[0]?.delta?.content || '';
    if (token) {
      fullResponse += token;
      res.write(`data: ${JSON.stringify({ token })}\n\n`);
    }
  }
  console.log(`[DEBUG] Stream completado. Longitud: ${fullResponse.length} caracteres.`);
  console.log(`[DEBUG] RESPUESTA COPILOTO: "${fullResponse}"`);

  // Persistir análisis táctico (solo si se corrió la Intérprete)
  if (interpreterAnalysis) {
    await prisma.partnerProfile.update({
      where: { userId },
      data: {
        lastInterpreterAnalysis: interpreterAnalysis,
        lastVisionDescription: interpreterAnalysis.style_analysis || undefined
      } as any
    }).catch(() => { });
  }

  return {
    response: cleanTacticalResponse(fullResponse),
    interpreter: interpreterAnalysis
  };
}


