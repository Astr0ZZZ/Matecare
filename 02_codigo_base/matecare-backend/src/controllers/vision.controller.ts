import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { calculateCycleState } from "../services/cycleEngine.service";
import { buildSystemPrompt } from "../services/promptEngine.service";
import { routeToAI, detectTier } from "../services/aiRouter.service";
import {
  analyzePartnerPhoto,
  neutralVisionContext,
  type VisionContext,
} from "../services/visionAnalysis.service";

// Tipos locales para evitar fallos de resolución de rutas externas
type MBTIType = 'INTJ' | 'ENTJ' | 'INFJ' | 'ENFJ' | 'ISTJ' | 'ESTJ' | 'ISFJ' | 'ESFJ' | 'INTP' | 'ENTP' | 'INFP' | 'ENFP' | 'ISTP' | 'ESTP' | 'ISFP' | 'ESFP';
type AttachmentStyle = 'SECURE' | 'ANXIOUS' | 'AVOIDANT' | 'DISORGANIZED';

interface AuthRequest extends Request {
  user?: { id: string };
}

/**
 * POST /api/ai/vision-chat
 */
export const handleVisionChat = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: "No autenticado" });

  const { image, userMessage } = req.body as { image?: string; userMessage?: string; };
  if (!image) return res.status(400).json({ error: "Se requiere el campo 'image' en base64" });

  try {
    const [profile, personalityProfile, historyData] = await Promise.all([
      prisma.partnerProfile.findUnique({ where: { userId } }),
      prisma.personalityProfile.findUnique({ where: { userId } }),
      (prisma as any).emotionalRecord.findMany({
        where: { 
          userId, 
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } 
        },
        orderBy: { createdAt: 'desc' },
        take: 5
      })
    ]);

    const emotionalHistory = (historyData as any[]).length > 0
      ? (historyData as any[]).map(r => `${r.createdAt.toISOString().split('T')[0]}: ${r.authenticityLabel}`).join(' | ')
      : 'Sin registros previos.';

    if (!profile?.lastPeriodDate) {
      return res.status(422).json({ error: "Perfil de pareja incompleto (falta ciclo)" });
    }

    let vision: VisionContext;

    try {
      console.log(`[VISION] Analizando foto para chat - Usuario: ${userId}`);
      vision = await analyzePartnerPhoto(image);
    } catch (visionError: any) {
      if (visionError.name === 'ImageQualityError') {
        // Imagen rechazada por el quality gate — informar al usuario, no usar fallback
        const reasonMap: Record<string, string> = {
          imagen_oscura: 'La foto tiene poca iluminación. Busca un lugar más iluminado.',
          sobreexpuesta: 'La foto tiene demasiada luz directa. Evita el flash o el sol directo.',
          imagen_borrosa: 'La foto está borrosa. Mantén el teléfono estable al tomar la foto.',
        };
        return res.status(422).json({
          error: 'imagen_rechazada',
          reason: visionError.reason,
          userMessage: reasonMap[visionError.reason] || 'La foto no tiene la calidad suficiente para el análisis.',
        });
      }
      console.warn("[VISION] DeepFace no disponible en chat, usando contexto neutro:", visionError.message);
      vision = neutralVisionContext();
    }

    const cycle = calculateCycleState(profile.lastPeriodDate, profile.cycleLength, profile.periodDuration);

    const systemPrompt = buildSystemPrompt({
      phase: cycle.phase,
      dayOfCycle: cycle.dayOfCycle,
      daysUntilNextPhase: cycle.daysUntilNextPhase,
      personalityType: profile.personalityType,
      socialLevel: profile.socialLevel,
      privacyLevel: profile.privacyLevel,
      conflictStyle: profile.conflictStyle,
      affectionStyle: profile.affectionStyle,
      mbtiType: (personalityProfile?.mbtiType as any),
      attachmentStyle: (personalityProfile?.attachmentStyle as any),
      preferences: personalityProfile?.preferences as any,
      visionContext: {
        ...vision,
        emotionalHistory
      },
    });

    const finalUserMessage = userMessage?.trim() || "Acabo de subir una foto de mi pareja. Dame el consejo táctico exacto para este momento.";
    const messages = [{ 
      role: "user" as const, 
      content: finalUserMessage,
      image: image // Pasamos la imagen base64 para análisis multimodal profundo
    }];

    const tier = detectTier(finalUserMessage);
    let aiResponse = await routeToAI(systemPrompt, messages, tier);

    // EXTRACCIÓN DE METADATOS: Buscamos el tag [ENTORNO: ..., ESTILO: ...]
    const sceneMatch = aiResponse.match(/\[ENTORNO:\s*(.*?),\s*ESTILO:\s*(.*?)\]/i);
    if (sceneMatch) {
      vision.environment = sceneMatch[1].trim();
      vision.style = sceneMatch[2].trim();
      // Limpiamos la respuesta para el usuario
      aiResponse = aiResponse.replace(/\[ENTORNO:.*?\].*?\n?/i, "").trim();
    }

    // PERSISTENCIA TÁCTICA: Guardamos el contexto detectado por la IA de visión para el Dashboard
    try {
      await prisma.personalityProfile.update({
        where: { userId },
        data: {
          preferences: {
            ...(personalityProfile?.preferences as any || {}),
            ...vision,
            lastDeepAnalysis: new Date().toISOString(),
          }
        }
      });
      console.log(`[VISION] Contexto táctico persistido (${vision.environment}) para usuario ${userId}`);
    } catch (persistError) {
      console.warn("[VISION] No se pudo persistir el contexto profundo, continuando...");
    }

    // 7. Persistir registro emocional para historial y tendencias
    // (fire-and-forget — no bloqueamos la respuesta por esto)
    if (vision.analysisVersion !== '2.0-fallback') {
      (prisma as any).emotionalRecord.create({
        data: {
          userId,
          dominantEmotion: vision.dominantEmotion,
          confidence: vision.faceConfidence ?? 0,
          isAuthentic: vision.isAuthentic ?? null,
          isSuppressed: vision.isSuppressed ?? false,
          hasDiscrepancy: vision.hasDiscrepancy ?? false,
          authenticityLabel: vision.authenticityLabel ?? vision.dominantEmotion,
          rawEmotions: vision.allEmotions ?? {},
          phase: cycle.phase,
          environment: vision.environment,
          analysisReliable: vision.analysisReliable ?? false,
        },
      }).catch((err: any) => console.warn('[Vision] Error guardando EmotionalRecord:', err.message));
    }

    return res.json({
      response: aiResponse,
      visionUsed: true,
      emotionDetected: vision.dominantEmotion,
      authenticityLabel: vision.authenticityLabel,
      isSuppressed: vision.isSuppressed,
      hasDiscrepancy: vision.hasDiscrepancy,
      bodyLanguage: vision.bodyLanguage,
      sceneCategory: vision.sceneCategory,
      fromCache: false,
    });

  } catch (error) {
    console.error("[VISION] Error crítico en vision-chat:", error);
    return res.status(500).json({ error: "Error interno al procesar la imagen" });
  }
};

/**
 * POST /api/ai/calibrate-profile
 */
export const handleProfileCalibration = async (req: Request, res: Response) => {
  const { imageBase64 } = req.body;
  const userId = (req as any).user?.id;

  console.log(`[VISION] Calibrando perfil para usuario: ${userId}`);

  if (!userId) {
    return res.status(401).json({ error: 'Usuario no autenticado' });
  }

  if (!imageBase64) {
    return res.status(400).json({ error: 'No se recibió la imagen (imageBase64)' });
  }

  try {
    let vision: VisionContext;
    let calibrationMethod = 'DEEPFACE';

    try {
      console.log(`[VISION] Calibrando perfil - Usuario: ${userId}`);
      vision = await analyzePartnerPhoto(imageBase64);
    } catch (visionError) {
      console.warn("[VISION] DeepFace falló en calibración. Aplicando rasgos base de seguridad.");
      vision = neutralVisionContext();
      calibrationMethod = 'FALLBACK_NEUTRAL';
    }

    const inferredTraits = {
      ...vision,
      calibrationMethod,
      lastCalibration: new Date().toISOString(),
    };

    const personality = await prisma.personalityProfile.findUnique({ where: { userId } });
    const currentPrefs = (personality?.preferences as any) || {};

    const updatedPersonality = await prisma.personalityProfile.upsert({
      where: { userId },
      update: {
        preferences: {
          ...currentPrefs,
          ...inferredTraits
        }
      },
      create: {
        userId,
        preferences: inferredTraits
      }
    });

    console.log(`[VISION] Perfil calibrado con éxito (${calibrationMethod}) para user ${userId}`);

    return res.json({
      success: true,
      traits: inferredTraits,
      message: calibrationMethod === 'DEEPFACE' 
        ? "Perfil calibrado con éxito basado en la lectura visual."
        : "Calibración completada con parámetros base (lectura visual limitada)."
    });

  } catch (error) {
    console.error("[VISION] Error fatal en calibración:", error);
    return res.status(500).json({ error: "Error al calibrar perfil" });
  }
};
