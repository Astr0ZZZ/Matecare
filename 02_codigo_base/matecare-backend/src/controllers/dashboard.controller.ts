import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { calculateCycleState } from '../services/cycleEngine.service';
import { redis, isConnected as isRedisConnected } from '../lib/redis';
import { getInsight } from '../services/insightCache.service';
import { generarMisionesTactica } from '../services/aiClient.service';

// Tipos locales para evitar fallos de resolución de rutas "shared"
type CyclePhase = 'MENSTRUAL' | 'FOLLICULAR' | 'OVULATION' | 'LUTEAL';

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
  console.log(`[DASHBOARD] Request start for user: ${userId}`);

  if (!userId) return res.status(401).json({ error: 'User ID is required' });

  try {
    const todayStart = new Date();
    todayStart.setUTCHours(0,0,0,0);

    // 1. Datos Base
    console.log('[DASHBOARD] Fetching base data (User, Profile, Personality)...');
    const [user, profile, personalityProfile] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { points: true } }),
      prisma.partnerProfile.findUnique({ where: { userId } }),
      prisma.personalityProfile.findUnique({ where: { userId } })
    ]);

    if (!profile) {
      console.warn(`[DASHBOARD] Profile not found for ${userId}`);
      return res.status(404).json({ error: 'Partner profile not found' });
    }
    console.log('[DASHBOARD] Base data loaded.');

    // 2. Misiones actuales
    console.log('[DASHBOARD] Fetching missions...');
    const existingMissions = await prisma.mission.findMany({ 
      where: { userId, createdAt: { gte: todayStart } },
      orderBy: { createdAt: 'desc' },
      take: 3
    }).catch(() => []);

    // 3. Cálculos
    const cycle = calculateCycleState(profile.lastPeriodDate, profile.cycleLength, profile.periodDuration);
    
    // 4. Recomendación (Con Timeout de seguridad de 5 segundos)
    console.log('[DASHBOARD] Calling getInsight...');
    let recommendation: string | null = null;
    
    try {
        const insightPromise = getInsight({
            mbtiType: (personalityProfile?.mbtiType as any) || 'INTJ',
            phase: cycle.phase as any,
            context: 'plan_tactic_diario' as any,
            affectionStyle: profile.affectionStyle as any,
            conflictStyle: profile.conflictStyle as any,
            attachmentStyle: (personalityProfile?.attachmentStyle as any) || 'SECURE',
            preferences: (personalityProfile?.preferences as any) || {},
        });

        const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000));
        recommendation = await Promise.race([insightPromise, timeoutPromise]);
    } catch (e) {
        console.error("[DASHBOARD] getInsight error:", e);
    }
    
    console.log(`[DASHBOARD] Insight resolved: ${recommendation ? 'OK' : 'TIMEOUT/FALLBACK'}`);

    // 5. Misiones en segundo plano
    if (existingMissions.length === 0) {
      (async () => {
        try {
          const gen = await generarMisionesTactica({ phase: cycle.phase });
          if (Array.isArray(gen) && gen.length > 0) {
            await Promise.all(gen.slice(0, 3).map(m => prisma.mission.create({
              data: {
                userId, 
                title: String(m.title || 'Misión Táctica').substring(0, 100), 
                description: String(m.description || '').substring(0, 500),
                category: (m.category || 'ACTS').toUpperCase(), 
                phaseContext: (cycle.phase as string).toUpperCase() as any
              }
            })));
          }
        } catch (err) {
          console.error('[DASHBOARD] BG mission gen failed:', err);
        }
      })();
    }

    console.log('[DASHBOARD] Sending final response.');
    return res.json({
      profile: { ...profile, points: user?.points || 0, mbti: personalityProfile || null },
      cycle: { 
        ...cycle, 
        phase: cycle.phase.toUpperCase(),
        totalLength: profile.cycleLength,
        periodDuration: profile.periodDuration
      },
      missions: existingMissions.length > 0 ? existingMissions : FALLBACK_MISSIONS[cycle.phase.toUpperCase()] || FALLBACK_MISSIONS.MENSTRUAL,
      recommendation: {
        text: recommendation || "Sincronizando tácticas...",
        fromCache: !!recommendation,
        isGenerating: false
      }
    });

  } catch (error) {
    console.error('[DASHBOARD] Global catch error:', error);
    return res.status(500).json({ error: 'Dashboard core failure' });
  }
};
