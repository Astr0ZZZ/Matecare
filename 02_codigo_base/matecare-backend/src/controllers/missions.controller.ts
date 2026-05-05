import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { calculateCycleState } from '../services/cycleEngine.service';
import { buildMessages } from '../services/promptEngine.service';
import { askAI } from '../services/aiClient.service';

export const getSuggestedMissions = async (req: Request, res: Response) => {
  const { userId } = req.params;

  try {
    const profile = await prisma.partnerProfile.findUnique({ where: { userId } });
    if (!profile) return res.status(404).json({ error: 'Profile not found' });

    const cycle = calculateCycleState(profile.lastPeriodDate, profile.cycleLength, profile.periodDuration);

    // 1. Ensure we have exactly 3 missions for today
    const today = new Date(new Date().setHours(0,0,0,0));
    // Borrar solo misiones incompletas de días anteriores (no tocar las de hoy)
    await prisma.mission.deleteMany({
      where: {
        userId,
        isCompleted: false,
        createdAt: { lt: today }
      }
    });

    const currentMissions = await prisma.mission.findMany({
      where: { userId, createdAt: { gte: today } }
    });

    if (currentMissions.length >= 3) {
      return res.json(currentMissions);
    }

    // 2. If not, generate with AI
    const messages = buildMessages({
      phase: cycle.phase,
      dayOfCycle: cycle.dayOfCycle,
      daysUntilNextPhase: cycle.daysUntilNextPhase,
      personalityType: profile.personalityType,
      socialLevel: profile.socialLevel,
      privacyLevel: profile.privacyLevel,
      conflictStyle: profile.conflictStyle,
      affectionStyle: profile.affectionStyle,
      userInput: "Genera 3 misiones tácticas concretas para hoy. Devuélvelas en formato JSON: [{ \"title\": \"...\", \"description\": \"...\", \"category\": \"...\" }]. Solo el JSON."
    });

    const aiResponse = await askAI(messages);
    
    let missions = [];
    try {
      const jsonMatch = aiResponse.match(/\[.*\]/s);
      if (jsonMatch) {
        missions = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      missions = [
        { title: 'Conexión suave', description: 'Un mensaje simple hoy vale por diez mañana.', category: 'SOCIAL' },
        { title: 'Cuidado extra', description: 'Observa una necesidad antes de que la pida.', category: 'ACTS' }
      ];
    }

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

export const updateMissionProgress = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { progress } = req.body;

  try {
    const mission = await prisma.mission.update({
      where: { id },
      data: { 
        progress,
        isCompleted: progress >= 100
      },
    });
    res.json(mission);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update mission' });
  }
};
