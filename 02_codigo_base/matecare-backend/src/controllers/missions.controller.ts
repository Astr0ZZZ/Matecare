import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { calculateCycleState } from '../services/cycleEngine.service';
import { getOracleAdvice } from '../services/ai.service';
import { POINTS_ECONOMY } from '../services/points.service';

export const getSuggestedMissions = async (req: Request, res: Response) => {
  const userId = (req as any).user?.id || req.params.userId;

  if (!userId) return res.status(401).json({ error: 'User ID is required' });

  try {
    const profile = await prisma.partnerProfile.findUnique({ where: { userId } });
    if (!profile) return res.status(404).json({ error: 'Profile not found' });

    const now = new Date();
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    
    // Buscar misiones no completadas
    const currentMissions = await prisma.mission.findMany({
      where: { userId, isCompleted: false }
    });

    if (currentMissions.length >= 3) {
      return res.json(currentMissions.slice(0, 3));
    }

    // Generar misiones si faltan
    await getOracleAdvice(userId);
    
    const newMissions = await prisma.mission.findMany({
      where: { userId, isCompleted: false },
      orderBy: { createdAt: 'desc' },
      take: 3
    });

    res.json(newMissions);
  } catch (error) {
    console.error('Error getting missions:', error);
    res.status(500).json({ error: 'Failed to get missions' });
  }
};

export const resetMissions = async (req: Request, res: Response) => {
  const userId = (req as any).user?.id || req.body.userId;

  try {
    const profile = await prisma.partnerProfile.findUnique({ where: { userId } });
    if (!profile) return res.status(404).json({ error: 'Profile not found' });

    // Borrar misiones no completadas para regenerar
    await prisma.mission.deleteMany({
      where: { userId, isCompleted: false }
    });

    await getOracleAdvice(userId, false, true); // forceRegenerate = true para bypass cache
    
    const newMissions = await prisma.mission.findMany({
      where: { userId, isCompleted: false },
      orderBy: { createdAt: 'desc' },
      take: 3
    });

    await prisma.partnerProfile.update({
      where: { userId },
      data: { lastMissionReset: new Date() }
    });

    res.json(newMissions);

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

    if (!wasCompleted && isNowCompleted) {
      await prisma.user.update({
        where: { id: userId },
        data: { points: { increment: POINTS_ECONOMY.MISSION_COMPLETED } }
      });
    }

    const updatedUser = await prisma.user.findUnique({ where: { id: userId }, select: { points: true } });
    res.json({ mission, newPoints: updatedUser?.points ?? 0 });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update mission' });
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

export const submitMissionEvidence = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { evidenceBase64, note } = req.body;
  const userId = (req as any).user?.id || req.body.userId;

  try {
    const mission = await prisma.mission.findUnique({ where: { id } });
    if (!mission) return res.status(404).json({ error: 'Mission not found' });
    if (mission.userId !== userId) return res.status(403).json({ error: 'Unauthorized' });

    const updatedMission = await prisma.mission.update({
      where: { id },
      data: {
        progress: 100,
        isCompleted: true,
        completedAt: new Date()
      }
    });

    if (!mission.isCompleted) {
      await prisma.user.update({
        where: { id: userId },
        data: { points: { increment: POINTS_ECONOMY.MISSION_COMPLETED } }
      });
    }

    const updatedUser = await prisma.user.findUnique({ where: { id: userId }, select: { points: true } });
    res.json({ mission: updatedMission, newPoints: updatedUser?.points ?? 0, success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to submit evidence' });
  }
};
