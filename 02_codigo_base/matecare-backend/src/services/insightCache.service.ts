import { prisma } from '../lib/prisma';
import { redis } from '../lib/redis';
import { askAI } from './aiClient.service';
import { InsightContext, MBTIType, AttachmentStyle } from '../../../shared/types/personality.types';
import { AffectionStyle, ConflictStyle, CyclePhase } from '@prisma/client';
import {
  MBTI_DESCRIPTIONS,
  ATTACHMENT_DESCRIPTIONS,
  PREFERENCE_DESCRIPTIONS
} from './personalityMapper.service';

// Cache en memoria para cuando Redis está offline
const memoryCache: Record<string, string> = {};

const CACHE_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 días en Redis
const DB_EXPIRY_DAYS = 30;

interface InsightRequest {
  mbtiType: MBTIType;
  phase: CyclePhase;
  context: InsightContext;
  affectionStyle: AffectionStyle;
  conflictStyle: ConflictStyle;
  attachmentStyle: AttachmentStyle;
  preferences?: {
    music?: string;
    plans?: string;
    stressedNeeds?: string;
  };
}

/**
 * Construye la clave de cache única para esta combinación.
 */
function buildCacheKey(req: InsightRequest): string {
  return `${req.mbtiType}_${req.phase}_${req.context}_${req.affectionStyle}_${req.conflictStyle}`;
}

/**
 * Construye el prompt específico para generar el insight.
 */
function buildInsightPrompt(req: InsightRequest): string {
  const mbtiDesc = MBTI_DESCRIPTIONS[req.mbtiType] || '';
  const attachDesc = ATTACHMENT_DESCRIPTIONS[req.attachmentStyle] || '';

  const prefMusic = req.preferences?.music
    ? PREFERENCE_DESCRIPTIONS.music[req.preferences.music as keyof typeof PREFERENCE_DESCRIPTIONS.music] || ''
    : '';
  const prefPlans = req.preferences?.plans
    ? PREFERENCE_DESCRIPTIONS.plans[req.preferences.plans as keyof typeof PREFERENCE_DESCRIPTIONS.plans] || ''
    : '';
  const prefStress = req.preferences?.stressedNeeds
    ? PREFERENCE_DESCRIPTIONS.stressedNeeds[req.preferences.stressedNeeds as keyof typeof PREFERENCE_DESCRIPTIONS.stressedNeeds] || ''
    : '';

  const contextDescriptions: Record<InsightContext, string> = {
    plan_romantico:          'El usuario quiere hacer algo romántico o especial para su pareja.',
    conflicto_tension:       'Hay tensión o un conflicto reciente en la relación.',
    necesita_espacio:        'La pareja parece necesitar espacio o está distante.',
    sorpresa_detalle:        'El usuario quiere sorprender a su pareja con un detalle.',
    comunicacion_importante: 'El usuario necesita tener una conversación importante.',
    dia_dificil:             'La pareja está teniendo un día difícil.',
  };

  return `Eres MateCare. Genera un insight específico y accionable para este caso.

PERFIL DE ELLA:
- Tipo MBTI: ${req.mbtiType} — ${mbtiDesc}
- Fase del ciclo: ${req.phase}
- Lenguaje de amor: ${req.affectionStyle}
- Manejo de conflictos: ${req.conflictStyle}
- Estilo de apego: ${req.attachmentStyle} — ${attachDesc}
${prefMusic ? `- Música: ${prefMusic}` : ''}
${prefPlans ? `- Planes favoritos: ${prefPlans}` : ''}
${prefStress ? `- Cuando está estresada: ${prefStress}` : ''}

SITUACIÓN ACTUAL:
${contextDescriptions[req.context]}

INSTRUCCIONES:
- Da exactamente 3 recomendaciones concretas y accionables.
- Cada una en 1-2 oraciones máximo.
- Explica brevemente por qué funciona dado su tipo MBTI y la fase del ciclo.
- Tono de amigo cercano, no de manual.
- Responde en español.`;
}

/**
 * Obtiene un insight: desde Redis → DB → Gemini (en ese orden de prioridad).
 */
export async function getInsight(req: InsightRequest): Promise<string> {
  const cacheKey = buildCacheKey(req);

  // 1. Buscar en Redis (más rápido)
  try {
    const redisResult = await redis.get(`insight:${cacheKey}`);
    if (redisResult) {
      console.log(`[Cache] HIT Redis: ${cacheKey}`);
      return redisResult;
    }
  } catch (e) {
    const memoryResult = memoryCache[`insight:${cacheKey}`];
    if (memoryResult) {
      console.log(`[Cache] HIT Memory: ${cacheKey}`);
      return memoryResult;
    }
  }

  // 2. Buscar en DB (persistente)
  const dbResult = await prisma.personalityInsight.findUnique({
    where: { cacheKey },
  });

  if (dbResult && dbResult.expiresAt > new Date()) {
    console.log(`[Cache] HIT DB: ${cacheKey}`);

    // Actualizar hit count y guardar en Redis para próxima vez
    await prisma.personalityInsight.update({
      where: { cacheKey },
      data: { hitCount: { increment: 1 } }
    });

    try {
      await redis.set(`insight:${cacheKey}`, dbResult.insight, { EX: CACHE_TTL_SECONDS });
    } catch (e) { /* Redis opcional */ }

    return dbResult.insight;
  }

  // 3. Generar con Gemini
  console.log(`[Cache] MISS — calling Gemini for: ${cacheKey}`);
  const prompt = buildInsightPrompt(req);
  const messages = [
    { role: 'system' as const, content: 'Eres MateCare, asistente de inteligencia emocional. Responde siempre en español.' },
    { role: 'user' as const, content: prompt }
  ];

  const insight = await askAI(messages) || "Lo más importante hoy es la presencia tranquila.";

  // Guardar en DB
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + DB_EXPIRY_DAYS);

  await prisma.personalityInsight.upsert({
    where: { cacheKey },
    update: { insight, expiresAt, hitCount: 0 },
    create: { cacheKey, insight, expiresAt }
  });

  // Guardar en Redis y Memoria
  try {
    memoryCache[`insight:${cacheKey}`] = insight;
    await redis.set(`insight:${cacheKey}`, insight, { EX: CACHE_TTL_SECONDS });
  } catch (e) { /* Opcional */ }

  return insight;
}

/**
 * Detecta el contexto de la pregunta del usuario para usar la clave correcta.
 * Keyword matching simple — se puede mejorar con IA si se necesita.
 */
export function detectInsightContext(userMessage: string): InsightContext {
  const msg = userMessage.toLowerCase();

  if (/pele[oó]|discut|conflict|enoja|molest|tension|distanci/.test(msg))
    return 'conflicto_tension';

  if (/espacio|sola|cerrada|no quiere hablar|ignora/.test(msg))
    return 'necesita_espacio';

  if (/sorpresa|detalle|regalo|detallit/.test(msg))
    return 'sorpresa_detalle';

  if (/hablar|decirl|conversa|important|serio/.test(msg))
    return 'comunicacion_importante';

  if (/mal d[ií]a|lloró|triste|difícil|estresad/.test(msg))
    return 'dia_dificil';

  return 'plan_romantico'; // default
}
