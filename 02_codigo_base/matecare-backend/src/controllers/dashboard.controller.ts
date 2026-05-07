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
    console.log(`[DASHBOARD] Starting summary for ${userId}`);

    // 1. Core Data (DB)
    const [user, profile, personalityProfile] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { points: true } }),
      prisma.partnerProfile.findUnique({ where: { userId } }),
      prisma.personalityProfile.findUnique({ where: { userId } })
    ]);

    if (!profile) return res.status(404).json({ error: 'Partner profile not found' });

    const cycle = calculateCycleState(profile.lastPeriodDate, profile.cycleLength, profile.periodDuration);

    // 2. Missions (Try Cache -> DB)
    const todayStr = new Date().toISOString().split('T')[0];
    const missionCacheKey = `missions:${userId}:${todayStr}`;
    const dailyCacheKey = `daily:${userId}:${todayStr}`;

    let missions: any[] = [];
    const cachedMissions = isRedisConnected ? await redis.get(missionCacheKey) : null;
    
    if (cachedMissions) {
      missions = JSON.parse(cachedMissions);
    } else {
      const now = new Date();
      const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
      missions = await prisma.mission.findMany({ where: { userId, createdAt: { gte: todayStart } } });
    }

    // 3. Recommendation (Try Cache)
    let recommendation = isRedisConnected ? await redis.get(dailyCacheKey) : memoryCache[dailyCacheKey];

    // 4. AI Generation (with a smart 5s wait window)
    const needsMissions = missions.length === 0;
    const needsRec = !recommendation;

    if (needsMissions || needsRec) {
      console.log(`[DASHBOARD] Content needed. Starting AI sync...`);
      
      const aiPromise = (async () => {
        try {
          const [generatedMissions, generatedRec] = await Promise.all([
            needsMissions ? generarMisionesTactica({ phase: cycle.phase }) : Promise.resolve(null),
            needsRec ? (async () => {
              if (personalityProfile?.mbtiType) {
                return await getInsight({
                  mbtiType: personalityProfile.mbtiType as MBTIType,
                  phase: cycle.phase as CyclePhase,
                  context: 'plan_romantico',
                  affectionStyle: (profile.affectionStyle as AffectionStyle) || 'QUALITY',
                  conflictStyle: (profile.conflictStyle as ConflictStyle) || 'CALM',
                  attachmentStyle: (personalityProfile?.attachmentStyle as AttachmentStyle) || 'SECURE',
                  preferences: (personalityProfile?.preferences as any) || {},
                });
              } else {
                const userTier = await determineTier(userId);
                
                const messages = buildMessages({
                  phase: cycle.phase, dayOfCycle: cycle.dayOfCycle,
                  daysUntilNextPhase: cycle.daysUntilNextPhase,
                  personalityType: profile.personalityType || 'AMBIVERT', 
                  socialLevel: profile.socialLevel || 'MEDIUM',
                  privacyLevel: profile.privacyLevel || 'MEDIUM', 
                  conflictStyle: profile.conflictStyle || 'CALM',
                  affectionStyle: profile.affectionStyle || 'QUALITY',
                  mbtiType: personalityProfile?.mbtiType as MBTIType,
                  attachmentStyle: (personalityProfile?.attachmentStyle as AttachmentStyle) || 'SECURE',
                  preferences: (personalityProfile?.preferences as any) || {},
                  userTier
                });

                if (messages.length > 0) {
                  return await routeToAI(messages[0].content, messages.slice(1).map(m => ({ role: m.role as any, content: m.content })), 'standard');
                }
                return "La matriz está sincronizando tus datos. Vuelve en un momento.";
              }
            })() : Promise.resolve(null)
          ]);

          if (Array.isArray(generatedMissions) && generatedMissions.length > 0) {
            try {
              const savedMissions = await Promise.all(generatedMissions.slice(0, 3).map(async (m: any) => {
                return prisma.mission.create({
                  data: {
                    userId, 
                    title: String(m.title || 'Misión Táctica').substring(0, 100), 
                    description: String(m.description || 'Consulta el centro de mando.').substring(0, 500),
                    category: (m.category || 'ROMANTIC').toUpperCase(), 
                    isCompleted: false,
                    progress: 0, 
                    phaseContext: (cycle.phase as string).toUpperCase() as any
                  }
                });
              }));
              missions = savedMissions;
              if (isRedisConnected) await redis.set(missionCacheKey, JSON.stringify(missions), { EX: 82800 });
            } catch (dbErr) {
              console.error('[DASHBOARD] Error saving AI missions to DB:', dbErr);
              // Si falla la DB, usamos los generados en memoria para no fallar la respuesta
              missions = generatedMissions.slice(0, 3);
            }
          }

          if (generatedRec) {
            recommendation = generatedRec;
            memoryCache[dailyCacheKey] = recommendation;
            if (isRedisConnected) await redis.set(dailyCacheKey, recommendation, { EX: 82800 });
          }
        } catch (innerError) {
          console.error('[DASHBOARD] AI background task error:', innerError);
        }
      })();

      await Promise.race([
        aiPromise,
        new Promise(resolve => setTimeout(resolve, 4000)) // 4s timeout for better UX
      ]);
    }

    const duration = Date.now() - start;
    console.log(`[DASHBOARD] Summary for ${userId} ready in ${duration}ms.`);

    return res.json({
      profile: { 
        ...profile, 
        points: user?.points || 0, 
        mbti: personalityProfile || null 
      },
      cycle: {
        ...cycle,
        phase: cycle.phase.toUpperCase() // Aseguramos mayúsculas para consistencia
      },
      missions: missions.length > 0 ? missions : FALLBACK_MISSIONS[cycle.phase.toUpperCase()] || FALLBACK_MISSIONS.MENSTRUAL,
      recommendation: {
        text: String(recommendation || "Sincronizando tácticas... Refresca en unos segundos para tu estrategia personalizada."),
        fromCache: !!recommendation
      }
    });

  } catch (error) {
    console.error('[DASHBOARD] Critical error:', error);
    return res.status(500).json({ error: 'Dashboard core failure' });
  }
};
