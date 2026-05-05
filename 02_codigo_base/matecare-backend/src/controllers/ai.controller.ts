import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { calculateCycleState } from '../services/cycleEngine.service';
import { buildMessages } from '../services/promptEngine.service';
import { askAI } from '../services/aiClient.service';

export const handleChat = async (req: Request, res: Response) => {
  const { userId, message, history } = req.body;

  try {
    const profile = await prisma.partnerProfile.findUnique({ where: { userId } });
    if (!profile) return res.status(404).json({ error: 'Profile not found' });

    const cycle = calculateCycleState(profile.lastPeriodDate, profile.cycleLength, profile.periodDuration);

    const messages = buildMessages({
      phase: cycle.phase,
      dayOfCycle: cycle.dayOfCycle,
      daysUntilNextPhase: cycle.daysUntilNextPhase,
      personalityType: profile.personalityType,
      socialLevel: profile.socialLevel,
      privacyLevel: profile.privacyLevel,
      conflictStyle: profile.conflictStyle,
      affectionStyle: profile.affectionStyle,
      userInput: message,
      interactionHistory: history
    });

    const aiResponse = await askAI(messages);
    res.json({ response: aiResponse });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Failed to process chat' });
  }
};

export const getDailyRecommendation = async (req: Request, res: Response) => {
  const { userId } = req.params;
  console.log(`[AI] Rec request for user: ${userId}`);

  try {
    const profile = await prisma.partnerProfile.findUnique({ where: { userId } });
    if (!profile) {
      console.log(`[AI] Profile NOT FOUND for: ${userId}`);
      return res.status(404).json({ error: 'Profile not found' });
    }
    console.log(`[AI] Profile found, calculating cycle...`);

    const cycle = calculateCycleState(profile.lastPeriodDate, profile.cycleLength, profile.periodDuration);

    const messages = buildMessages({
      phase: cycle.phase,
      dayOfCycle: cycle.dayOfCycle,
      daysUntilNextPhase: cycle.daysUntilNextPhase,
      personalityType: profile.personalityType,
      socialLevel: profile.socialLevel,
      privacyLevel: profile.privacyLevel,
      conflictStyle: profile.conflictStyle,
      affectionStyle: profile.affectionStyle,
    });

    const aiResponse = await askAI(messages);
    res.json({ recommendation: aiResponse, cycle });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get recommendation' });
  }
};
