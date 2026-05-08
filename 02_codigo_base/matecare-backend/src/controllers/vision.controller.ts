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
    const [profile, personalityProfile] = await Promise.all([
      prisma.partnerProfile.findUnique({ where: { userId } }),
      prisma.personalityProfile.findUnique({ where: { userId } }),
    ]);

    if (!profile?.lastPeriodDate) {
      return res.status(422).json({ error: "Perfil de pareja incompleto (falta ciclo)" });
    }

    let vision: VisionContext;
    try {
      console.log(`[VISION] Analizando foto para chat - Usuario: ${userId}`);
      vision = await analyzePartnerPhoto(image);
    } catch (visionError) {
      console.warn("[VISION] DeepFace no disponible en chat, usando contexto neutro.");
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
      visionContext: vision,
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

    return res.json({
      response: aiResponse,
      visionUsed: true,
      emotionDetected: vision.dominantEmotion,
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
