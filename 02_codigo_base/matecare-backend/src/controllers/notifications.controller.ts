import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export const registerToken = async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  const { token } = req.body;

  if (!userId || !token) {
    return res.status(400).json({ error: 'Faltan datos (userId o token)' });
  }

  try {
    await prisma.user.update({
      where: { id: userId },
      data: { pushToken: token } as any
    });
    console.log(`[NOTIFICATIONS] Token registrado para usuario: ${userId}`);
    return res.json({ success: true });
  } catch (error) {
    console.error('[NOTIFICATIONS] Error guardando token:', error);
    return res.status(500).json({ error: 'Failed to register token' });
  }
};
