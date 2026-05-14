import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { calculateCycleState } from '../services/cycleEngine.service';
import { getOracleAdvice } from '../services/ai.service';

/**
 * Dashboard Táctico V3.0 - Optimizado para Velocidad Extrema
 */
export const getDashboardSummary = async (req: Request, res: Response) => {
  let userId = (req as any).user?.id || req.params.userId;

  if (!userId || userId === 'undefined') {
    return res.status(401).json({ error: 'Identidad no válida' });
  }

  try {
    // 1. CARGA PARALELA (Base + Misiones): Todo lo que ya EXISTE.
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [profile, existingMissions] = await Promise.all([
      prisma.partnerProfile.findUnique({ where: { userId }, include: { user: true } }),
      prisma.mission.findMany({ where: { userId, createdAt: { gte: today } } })
    ]);

    if (!profile) return res.status(404).json({ error: 'Perfil no encontrado' });

    // 2. CÁLCULO INSTANTÁNEO + HUMANIZACIÓN
    const cycleData = {
      ...calculateCycleState(profile.lastPeriodDate, profile.cycleLength, profile.periodDuration),
      phaseLabel: calculateCycleState(profile.lastPeriodDate, profile.cycleLength, profile.periodDuration).phase.toLowerCase()
    };

    // 3. Misiones con Fallback para que la Ruleta nunca esté vacía
    const FALLBACK_MISSIONS = [
      { id: 'fb-1', title: 'Kit de Confort', description: 'Bebida favorita sin que lo pida.', category: 'GIFT', progress: 0 },
      { id: 'fb-2', title: 'Espacio Seguro', description: 'Evita temas difíciles hoy.', category: 'ACTS', progress: 0 },
      { id: 'fb-3', title: 'Validación', description: 'Escucha activa 10 min.', category: 'ACTS', progress: 0 }
    ];

    // 4. ORÁCULO ULTRA-RÁPIDO (Caché en 0ms)
    let cachedAdvice = await getOracleAdvice(userId, true);
    
    // Limpieza de basura (saludos antiguos pegados en la DB)
    if (cachedAdvice) {
      cachedAdvice = cachedAdvice.replace(/Hola soy tu compañero matecare,? ?/gi, '');
      cachedAdvice = cachedAdvice.replace(/¿necesitas ayuda en algo o un consejo para tu relación\?? ?/gi, '');
      cachedAdvice = cachedAdvice.replace(/Aquí está el reporte diario\.? ?/gi, '');
    }
    
    // Control de antigüedad del análisis (6 horas máximo)
    const adviceUpdatedAt = (profile as any).adviceUpdatedAt;
    const isAnalysisOld = !adviceUpdatedAt || (today.getTime() - new Date(adviceUpdatedAt).getTime()) > 6 * 60 * 60 * 1000;
    
    let finalInterpreter = (profile as any).lastInterpreterAnalysis;
    if (isAnalysisOld || !finalInterpreter) {
      finalInterpreter = {
        real_state: "Análisis Pendiente",
        style_analysis: "Sin contexto visual",
      };
    }

    // RESPUESTA INMEDIATA (Garantiza que la Ruleta cargue)
    res.json({
      profile,
      cycle: cycleData,
      missions: existingMissions.length > 0 ? existingMissions : FALLBACK_MISSIONS,
      recommendation: {
        text: (cachedAdvice && cachedAdvice.trim().length > 0) ? cachedAdvice.trim() : "Sincronizando reporte táctico...",
        interpreter: null,  // Los chips internos van en Vision Control, no en el Dashboard
        isGenerating: !cachedAdvice
      }
    });


    // 4. BACKGROUND: Si no hay datos, unificamos la generación en una sola llamada a GPT-5 Nano
    // getOracleAdvice ahora se encarga de generar tanto el consejo como las misiones.
    if (!cachedAdvice || existingMissions.length === 0) {
      getOracleAdvice(userId).catch(e => console.error("BG-Tactical-Sync Error:", e));
    }

  } catch (error: any) {
    console.error('[Dashboard] Error Crítico:', error);
    res.status(500).json({ error: 'Fallo en motor táctico' });
  }
};
