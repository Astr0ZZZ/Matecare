import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { calculateCycleState } from '../services/cycleEngine.service';
import { generarMisionesTactica } from '../services/aiClient.service';
import { POINTS_ECONOMY } from '../services/points.service';

export const getSuggestedMissions = async (req: Request, res: Response) => {
  const userId = (req as any).user?.id || req.params.userId;

  try {
    const profile = await prisma.partnerProfile.findUnique({ where: { userId } });
    if (!profile) return res.status(404).json({ error: 'Profile not found' });

    const cycle = calculateCycleState(profile.lastPeriodDate, profile.cycleLength, profile.periodDuration);

    // Definimos "hoy" de forma más robusta (comienzo del día en UTC para consistencia con la DB)
    const now = new Date();
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    
    console.log(`[Missions] Fetching for user ${userId}, phase ${cycle.phase}, since ${today.toISOString()}`);

    const currentMissions = await prisma.mission.findMany({
      where: { 
        userId, 
        createdAt: { gte: today } 
      }
    });

    if (currentMissions.length > 0) {
      console.log(`[Missions] Found ${currentMissions.length} missions for today.`);
      return res.json(currentMissions);
    }

    const missions = await generarMisionesTactica({ phase: cycle.phase });

    const savedMissions = await Promise.all(missions.slice(0, 3).map(async (m: any) => {
      return prisma.mission.create({
        data: {
          userId,
          title: m.title,
          description: m.description,
          category: m.category || 'ROMANTIC',
          isCompleted: false,
          progress: 0,
          phaseContext: cycle.phase as any
        }
      });
    }));

    res.json(savedMissions);
  } catch (error) {
    console.error('Error getting missions:', error);
    res.status(500).json({ error: 'Failed to get missions' });
  }
};

export const resetMissions = async (req: Request, res: Response) => {
  const userId = (req as any).user?.id || req.body.userId;
  const COOLDOWN_HOURS = 6;

  try {
    const profile = await prisma.partnerProfile.findUnique({ where: { userId } });
    if (!profile) return res.status(404).json({ error: 'Profile not found' });

    // Verificar Cooldown
    if (profile.lastMissionReset) {
      const hoursSinceReset = (Date.now() - new Date(profile.lastMissionReset).getTime()) / (1000 * 60 * 60);
      if (hoursSinceReset < COOLDOWN_HOURS) {
        const remaining = Math.ceil(COOLDOWN_HOURS - hoursSinceReset);
        return res.status(429).json({ 
          error: `Matriz en recarga. Espera ${remaining} horas para nuevas coordenadas.`,
          remainingHours: remaining
        });
      }
    }

    // Borrar misiones de hoy y generar nuevas
    const now = new Date();
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    
    await prisma.mission.deleteMany({
      where: { userId, createdAt: { gte: today } }
    });

    const cycle = calculateCycleState(profile.lastPeriodDate, profile.cycleLength, profile.periodDuration);
    const missions = await generarMisionesTactica({ phase: cycle.phase });

    const savedMissions = await Promise.all(missions.slice(0, 3).map(async (m: any) => {
      return prisma.mission.create({
        data: {
          userId,
          title: m.title,
          description: m.description,
          category: m.category || 'ROMANTIC',
          phaseContext: cycle.phase as any
        }
      });
    }));

    // Actualizar timestamp de reset
    await prisma.partnerProfile.update({
      where: { userId },
      data: { lastMissionReset: new Date() }
    });

    res.json(savedMissions);
  } catch (error) {
    res.status(500).json({ error: 'Reset failed' });
  }
};

export const updateMissionProgress = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { progress } = req.body;
  const userId = (req as any).user?.id || req.body.userId;

  try {
    const oldMission = await prisma.mission.findUnique({ where: { id } });
    if (!oldMission) return res.status(404).json({ error: 'Mission not found' });

    const wasCompleted = oldMission.isCompleted;
    const isNowCompleted = progress >= 100;

    const mission = await prisma.mission.update({
      where: { id },
      data: { 
        progress,
        isCompleted: isNowCompleted,
        completedAt: isNowCompleted ? new Date() : null
      },
    });

    // Lógica de Puntos
    if (!wasCompleted && isNowCompleted) {
      await prisma.user.update({
        where: { id: userId },
        data: { points: { increment: POINTS_ECONOMY.MISSION_COMPLETED } }
      });
    } else if (wasCompleted && !isNowCompleted) {
      await prisma.user.update({
        where: { id: userId },
        data: { points: { decrement: POINTS_ECONOMY.MISSION_COMPLETED } }
      });
    }

    res.json(mission);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update mission' });
  }
};

export const uploadEvidence = async (req: Request, res: Response) => {
  const { missionId, imageUrl } = req.body;
  const userId = (req as any).user?.id || req.body.userId;

  try {
    const mission = await prisma.mission.update({
      where: { id: missionId },
      data: { imageUrl }
    });

    // Bonus por foto
    await prisma.user.update({
      where: { id: userId },
      data: { points: { increment: POINTS_ECONOMY.EVIDENCE_UPLOADED } }
    });

    res.json({ success: true, mission });
  } catch (error) {
    res.status(500).json({ error: 'Evidence upload failed' });
  }
};

export const getMissionHistory = async (req: Request, res: Response) => {
  const userId = req.params.userId || (req as any).user?.id;
  try {
    const missions = await prisma.mission.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });
    res.json(missions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch history' });
  }
};


