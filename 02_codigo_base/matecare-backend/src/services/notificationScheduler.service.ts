import { Expo, ExpoPushMessage } from 'expo-server-sdk';
import cron from 'node-cron';
import { prisma } from '../lib/prisma';
import { getInsight } from './insightCache.service';
import { calculateCycleState } from './cycleEngine.service';
import { 
  MBTIType, 
  InsightContext, 
  AttachmentStyle 
} from '../../../shared/types/personality.types';
import { 
  CyclePhase, 
  AffectionStyle, 
  ConflictStyle 
} from '@prisma/client';

const expo = new Expo();

/**
 * Envía una notificación push individual a través de Expo
 */
export const sendPushToUser = async (userId: string, title: string, body: string, data?: any) => {
  const user = await (prisma.user as any).findUnique({
    where: { id: userId },
    select: { pushToken: true }
  });

  if (!user?.pushToken || !Expo.isExpoPushToken(user.pushToken)) {
    console.log(`[PUSH] Token inválido o no encontrado para usuario ${userId}`);
    return;
  }

  const messages: ExpoPushMessage[] = [{
    to: user.pushToken,
    sound: 'default',
    title,
    body,
    data: data || { userId },
  }];

  try {
    const chunks = expo.chunkPushNotifications(messages);
    for (const chunk of chunks) {
      await expo.sendPushNotificationsAsync(chunk);
    }
    console.log(`[PUSH] Notificación enviada a ${userId}: ${title}`);
  } catch (error) {
    console.error(`[PUSH] Error enviando a ${userId}:`, error);
  }
};

/**
 * Inicializa los cron jobs de la aplicación
 */
export const initNotificationScheduler = () => {
  console.log('[SCHEDULER] Inicializando tareas programadas (Daily Tips)...');

  // Cron: '0 9 * * *' -> Ejecuta todos los días a las 9:00 AM
  // Para pruebas rápidas podrías usar '*/5 * * * *' (cada 5 min)
  cron.schedule('0 9 * * *', async () => {
    console.log('[SCHEDULER] Ejecutando envío masivo de tips diarios...');
    
    const users = await (prisma.user as any).findMany({
      where: { 
        pushToken: { not: null },
        partnerProfile: { isNot: null } 
      },
      include: { 
        partnerProfile: true,
        personalityProfile: true 
      }
    });

    for (const user of users) {
      if (!user.partnerProfile) continue;

      try {
        const cycle = calculateCycleState(
          user.partnerProfile.lastPeriodDate, 
          user.partnerProfile.cycleLength, 
          user.partnerProfile.periodDuration
        );

        // Generar tip personalizado basado en el estado actual
        const tip = await getInsight({
          mbtiType: (user.personalityProfile?.mbtiType as MBTIType) || 'INTJ',
          phase: cycle.phase as CyclePhase,
          context: 'plan_tactic_diario' as any,
          affectionStyle: user.partnerProfile.affectionStyle as AffectionStyle,
          conflictStyle: user.partnerProfile.conflictStyle as ConflictStyle,
          attachmentStyle: (user.personalityProfile?.attachmentStyle as AttachmentStyle) || 'SECURE',
          preferences: (user.personalityProfile?.preferences as any) || {},
        });

        await sendPushToUser(
          user.id, 
          `REPORTE TÁCTICO: Fase ${cycle.phase}`, 
          tip
        );
      } catch (e) {
        console.error(`[SCHEDULER] Error procesando usuario ${user.id}:`, e);
      }
    }
  }, {
    timezone: "America/Santiago" // Ajustar según zona horaria del usuario o servidor
  });
};
