import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { calculateCycleState } from '../services/cycleEngine.service';
import { generateMissions } from '../services/ai.service';
import { POINTS_ECONOMY } from '../services/points.service';

export const getSuggestedMissions = async (req: Request, res: Response) => {
  const userId = (req as any).user?.id || req.params.userId;

  if (!userId) return res.status(401).json({ error: 'User ID is required' });

  try {
    const profile = await prisma.partnerProfile.findUnique({ where: { userId } });
    if (!profile) return res.status(404).json({ error: 'Profile not found' });

    const now = new Date();
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    
    // Buscar misiones de hoy
    const currentMissions = await prisma.mission.findMany({
      where: { userId, createdAt: { gte: today } }
    });

    if (currentMissions.length > 0) {
      return res.json(currentMissions);
    }

    // Generar misiones con el nuevo sistema (generateMissions ya las guarda en DB)
    await generateMissions(userId);
    
    // Devolver las misiones recién creadas
    const newMissions = await prisma.mission.findMany({
      where: { userId, createdAt: { gte: today } }
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

    const now = new Date();
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    
    await prisma.mission.deleteMany({
      where: { userId, createdAt: { gte: today } }
    });

    await generateMissions(userId);
    
    const newMissions = await prisma.mission.findMany({
      where: { userId, createdAt: { gte: today } }
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

export const uploadEvidence = async (req: Request, res: Response) => {
  const { missionId, imageUrl } = req.body;
  const userId = (req as any).user?.id || req.body.userId;

  try {
    const mission = await prisma.mission.update({
      where: { id: missionId },
      data: { imageUrl }
    });

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



