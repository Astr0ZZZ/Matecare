import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { calculateCycleState } from '../services/cycleEngine.service';
import { redis, isConnected as isRedisConnected } from '../lib/redis';
import { getInsight } from '../services/insightCache.service';
import { buildMessages } from '../services/promptEngine.service';
import { routeToAI, detectTier, determineTier } from '../services/aiRouter.service';
import { generarMisionesTactica } from '../services/aiClient.service';
import type { MBTIType, AttachmentStyle } from '../../../shared/types/personality.types';
import type { CyclePhase, AffectionStyle, ConflictStyle } from '@prisma/client';

const memoryCache: Record<string, string> = {};

const FALLBACK_MISSIONS: Record<string, any[]> = {
  MENSTRUAL: [
    { title: 'Kit de Confort', description: 'Prepara su manta favorita y algo caliente sin que lo pida.', category: 'ACTS' },
    { title: 'Espacio Seguro', description: 'Evita planes sociales ruidosos hoy. Prioriza el descanso.', category: 'QUALITY' },
    { title: 'Validación Táctica', description: 'Escucha sin intentar resolver. Valida su sentir.', category: 'VERBAL' }
  ],
  FOLLICULAR: [
    { title: 'Aventura Ligera', description: 'Propón una caminata o salida al aire libre.', category: 'QUALITY' },
    { title: 'Elogio Estratégico', description: 'Reconoce su brillo y energía renovada.', category: 'VERBAL' },
    { title: 'Apoyo Proactivo', description: 'Ayúdala con una tarea pendiente para liberar su agenda.', category: 'ACTS' }
  ],
  OVULATION: [
    { title: 'Cita de Alto Impacto', description: 'Es su momento de mayor energía social. Salgan a lucirse.', category: 'QUALITY' },
    { title: 'Conexión Profunda', description: 'Busca una conversación significativa sobre el futuro.', category: 'VERBAL' },
    { title: 'Detalle Físico', description: 'El contacto físico es clave en esta fase.', category: 'PHYSICAL' }
  ],
  LUTEAL: [
    { title: 'Paciencia Blindada', description: 'Cualquier roce es por la fase. Sé su roca de calma.', category: 'ACTS' },
    { title: 'Snack de Emergencia', description: 'Ten a mano su comida reconfortante favorita.', category: 'ACTS' },
    { title: 'Refuerzo Positivo', description: 'Recuérdale lo increíble que es, especialmente si se siente insegura.', category: 'VERBAL' }
  ]
};

export const getDashboardSummary = async (req: Request, res: Response) => {
  const userId = req.params.userId || (req as any).user?.id;
  const start = Date.now();

  if (!userId) return res.status(401).json({ error: 'User ID is required' });

  try {
    const [user, profile, personalityProfile] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { points: true } }),
      prisma.partnerProfile.findUnique({ where: { userId } }),
      prisma.personalityProfile.findUnique({ where: { userId } })
    ]);

    if (!profile) return res.status(404).json({ error: 'Partner profile not found' });

    const cycle = calculateCycleState(profile.lastPeriodDate, profile.cycleLength, profile.periodDuration);

    // 1. Fechas y claves
    const now = new Date();
    const localDate = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
    const missionCacheKey = `missions:${userId}:${localDate}`;
    const dailyCacheKey = `daily:${userId}:${cycle.phase}`;
    const todayStart = new Date();
    todayStart.setUTCHours(0,0,0,0);

    // 2. Fetch Missions (Limit 3)
    let missions: any[] = [];
    const cachedMissions = isRedisConnected ? await redis.get(missionCacheKey) : null;
    if (cachedMissions) {
      missions = JSON.parse(cachedMissions);
    } else {
      missions = await prisma.mission.findMany({ 
        where: { userId, createdAt: { gte: todayStart } },
        orderBy: { createdAt: 'desc' },
        take: 3
      });
    }

    // 3. Fetch Recommendation using Insight Engine
    let recommendation: string | null = null;
    try {
      recommendation = await getInsight({
        mbtiType: (personalityProfile?.mbtiType as MBTIType) || 'INTJ',
        phase: cycle.phase as CyclePhase,
        context: 'plan_romantico' as any, // Contexto diario táctico
        affectionStyle: profile.affectionStyle as AffectionStyle,
        conflictStyle: profile.conflictStyle as ConflictStyle,
        attachmentStyle: (personalityProfile?.attachmentStyle as AttachmentStyle) || 'SECURE',
        preferences: (personalityProfile?.preferences as any) || {},
      });
    } catch (e) {
      console.warn("[DASHBOARD] getInsight failed, using local/memory fallback:", e);
      recommendation = isRedisConnected ? await redis.get(dailyCacheKey) : memoryCache[dailyCacheKey];
      if (!recommendation) {
        const dbRec = await prisma.personalityInsight.findUnique({ where: { cacheKey: dailyCacheKey } });
        if (dbRec) recommendation = dbRec.insight;
      }
    }

    // 4. Background Task (solo para misiones, la recomendación ya la maneja getInsight)
    const needsMissions = missions.length === 0;

    if (needsMissions) {
      (async () => {
        try {
          const tasks = [];

          if (needsMissions) {
            tasks.push((async () => {
              // Anti-duplicados: re-chequeo
              const existing = await prisma.mission.count({ where: { userId, createdAt: { gte: todayStart } } });
              if (existing > 0) return;

              const gen = await generarMisionesTactica({ phase: cycle.phase });
              if (Array.isArray(gen) && gen.length > 0) {
                const saved = await Promise.all(gen.slice(0, 3).map(m => prisma.mission.create({
                  data: {
                    userId, 
                    title: String(m.title || 'Misión Táctica').substring(0, 100), 
                    description: String(m.description || '').substring(0, 500),
                    category: (m.category || 'ACTS').toUpperCase(), 
                    phaseContext: (cycle.phase as string).toUpperCase() as any
                  }
                })));
                if (isRedisConnected) await redis.set(missionCacheKey, JSON.stringify(saved), { EX: 82800 });
              }
            })());
          }

          await Promise.all(tasks);
        } catch (err) {
          console.error('[DASHBOARD] BG task failed:', err);
        }
      })();
    }

    return res.json({
      profile: { ...profile, points: user?.points || 0, mbti: personalityProfile || null },
      cycle: { 
        ...cycle, 
        phase: cycle.phase.toUpperCase(),
        totalLength: profile.cycleLength,
        periodDuration: profile.periodDuration
      },
      missions: missions.length > 0 ? missions : FALLBACK_MISSIONS[cycle.phase.toUpperCase()] || FALLBACK_MISSIONS.MENSTRUAL,
      recommendation: {
        text: recommendation || "Sincronizando tácticas...",
        fromCache: !!recommendation,
        isGenerating: false
      }
    });

  } catch (error) {
    console.error('[DASHBOARD] Critical error:', error);
    return res.status(500).json({ error: 'Dashboard core failure' });
  }
};
