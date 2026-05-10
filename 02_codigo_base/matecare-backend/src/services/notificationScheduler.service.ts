import { Expo, ExpoPushMessage } from 'expo-server-sdk';
import cron from 'node-cron';
import { prisma } from '../lib/prisma';
import { calculateCycleState } from './cycleEngine.service';
import { getOracleAdvice } from './ai.service';

import { 
  MBTIType, 
  InsightContext, 
  AttachmentStyle 
} from '../types/personalityTypes';


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
  const user = await prisma.user.findUnique({
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
  cron.schedule('0 9 * * *', async () => {
    console.log('[SCHEDULER] Ejecutando envío masivo de tips diarios...');
    
    try {
      const users = await prisma.user.findMany({
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

          // Generar tip personalizado usando el orquestador V3.0
          const tip = await getOracleAdvice(user.id);
          if (!tip) continue;

          await sendPushToUser(
            user.id, 
            `REPORTE TÁCTICO: Fase ${cycle.phase}`, 
            tip
          );
        } catch (e) {
          console.error(`[SCHEDULER] Error procesando usuario ${user.id}:`, e);
        }
      }
    } catch (error) {
      console.error('[SCHEDULER] Error crítico en envío masivo:', error);
    }
  }, {
    timezone: "America/Santiago"
  });
};

