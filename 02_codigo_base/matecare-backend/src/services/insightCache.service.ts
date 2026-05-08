import { prisma } from '../lib/prisma';
import { redis, isConnected as isRedisConnected } from '../lib/redis';
import { askAI } from './aiClient.service';
import { InsightContext, MBTIType, AttachmentStyle } from '../../../shared/types/personality.types';
import { AffectionStyle, ConflictStyle, CyclePhase } from '@prisma/client';
import {
  MBTI_DESCRIPTIONS,
  ATTACHMENT_DESCRIPTIONS,
  PREFERENCE_DESCRIPTIONS
} from './personalityMapper.service';
import { VisionContext } from './visionAnalysis.service';

// Nivel 1 - Cache en memoria (Ultra-rápido)
const memoryCache = new Map<string, string>();

const CACHE_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 días
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
  visionContext?: VisionContext; // Nuevo: Soporte para Visión
}

/**
 * Mapeo táctico de emociones a contexto de relación
 */
const EMOTION_CONTEXT_MAP: Record<string, string> = {
  happy:    'está en un momento de conexión positiva y alegría.',
  sad:      'necesita contención emocional; prioriza la escucha activa.',
  angry:    'está en un estado de activación o enojo; evita la confrontación directa.',
  fear:     'muestra señales de ansiedad; ofrece seguridad y calma.',
  disgust:  'muestra señales de rechazo; revisa la dinámica reciente.',
  surprise: 'está en un estado de apertura emocional; buen momento para algo especial.',
  neutral:  'está en un estado basal equilibrado.',
};

function buildCacheKey(req: InsightRequest): string {
  const emotion = req.visionContext?.dominantEmotion || 'none';
  return `${req.mbtiType}_${req.phase}_${req.context}_${emotion}_${req.affectionStyle}`;
}

function buildInsightPrompt(req: InsightRequest): string {
  const mbtiDesc = MBTI_DESCRIPTIONS[req.mbtiType] || '';
  const attachDesc = ATTACHMENT_DESCRIPTIONS[req.attachmentStyle] || '';
  const vision = req.visionContext;

  return `Eres MateCare, asistente de inteligencia emocional. Genera 3 consejos tácticos.

${vision ? `
## CONTEXTO DE VISIÓN (Prioridad Máxima)
A través del análisis visual, hemos detectado que ella ${EMOTION_CONTEXT_MAP[vision.dominantEmotion] || 'está tranquila'}.
- Emoción dominante: ${vision.dominantEmotion} (Confianza: ${vision.emotionConfidence}%)
- Edad estimada: ${vision.estimatedAge} años.
*INSTRUCCIÓN:* Si la situación de chat parece normal pero la visión indica estrés o tristeza, prioriza lo que dice la visión.` : ''}

## PERFIL PSICOLÓGICO
- Tipo MBTI: ${req.mbtiType} — ${mbtiDesc}
- Fase del ciclo: ${req.phase}
- Estilo de apego: ${req.attachmentStyle} — ${attachDesc}

INSTRUCCIONES:
- Da exactamente 3 recomendaciones concretas.
- Cada una en 1-2 oraciones máximo.
- Tono de amigo táctico, no clínico.
- Responde en español.`;
}

export async function getInsight(req: InsightRequest): Promise<string> {
  const cacheKey = buildCacheKey(req);
  const fullCacheKey = `insight:${cacheKey}`;

  // 1. L1 - Memory Cache
  if (memoryCache.has(fullCacheKey)) {
    console.log(`[Cache] HIT L1 (Memory): ${cacheKey}`);
    return memoryCache.get(fullCacheKey)!;
  }

  // 2. L2 - Redis Cache
  if (isRedisConnected) {
    try {
      const cached = await redis.get(fullCacheKey);
      if (cached) {
        console.log(`[Cache] HIT L2 (Redis): ${cacheKey}`);
        memoryCache.set(fullCacheKey, cached);
        return cached;
      }
    } catch (e) { /* Fallback to DB */ }
  }

  // 3. L3 - Database
  const dbResult = await prisma.personalityInsight.findUnique({ where: { cacheKey } });
  if (dbResult && dbResult.expiresAt > new Date()) {
    console.log(`[Cache] HIT L3 (DB): ${cacheKey}`);
    
    // Subir a niveles superiores
    memoryCache.set(fullCacheKey, dbResult.insight);
    if (isRedisConnected) {
      try { await redis.set(fullCacheKey, dbResult.insight, { EX: CACHE_TTL_SECONDS }); } catch (e) {}
    }
    return dbResult.insight;
  }

  // 4. MISS - IA Generation
  console.log(`[Cache] MISS - Generando con IA: ${cacheKey}`);
  const prompt = buildInsightPrompt(req);
  const messages = [
    { role: 'system' as const, content: 'Eres MateCare. Consejos cortos, tácticos y precisos.' },
    { role: 'user' as const, content: prompt }
  ];

  const insight = await askAI(messages) || "Prioriza la presencia tranquila hoy.";

  // Guardar en todos los niveles
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + DB_EXPIRY_DAYS);

  await prisma.personalityInsight.upsert({
    where: { cacheKey },
    update: { insight, expiresAt, hitCount: { increment: 1 } },
    create: { cacheKey, insight, expiresAt }
  });

  memoryCache.set(fullCacheKey, insight);
  if (isRedisConnected) {
    try { await redis.set(fullCacheKey, insight, { EX: CACHE_TTL_SECONDS }); } catch (e) {}
  }

  return insight;
}

export function detectInsightContext(userMessage: string): InsightContext {
  const msg = userMessage.toLowerCase();
  if (/pele|discut|conflict|enoja|molest/.test(msg)) return 'conflicto_tension';
  if (/espacio|sola|distante/.test(msg)) return 'necesita_espacio';
  if (/sorpresa|detalle|regalo/.test(msg)) return 'sorpresa_detalle';
  if (/hablar|conversa|important/.test(msg)) return 'comunicacion_importante';
  if (/mal d[ií]a|triste|estresad/.test(msg)) return 'dia_dificil';
  return 'plan_romantico';
}
