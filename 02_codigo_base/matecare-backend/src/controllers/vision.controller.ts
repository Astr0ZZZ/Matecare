/**
 * vision.controller.ts
 *
 * Nuevo endpoint: POST /api/ai/vision-chat
 * Recibe la foto, llama a DeepFace, inyecta el contexto visual
 * en el promptEngine existente y devuelve el consejo táctico.
 *
 * Ubicación: matecare-backend/src/controllers/vision.controller.ts
 */

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
import type { MBTIType, AttachmentStyle } from "../../../shared/types/personality.types";
import type { CyclePhase, AffectionStyle, ConflictStyle } from "@prisma/client";

interface AuthRequest extends Request {
  user?: { id: string };
}

/**
 * POST /api/ai/vision-chat
 * Body: { image: string (base64), userMessage?: string }
 */
export const handleVisionChat = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ error: "No autenticado" });
  }

  const { image, userMessage } = req.body as {
    image?: string;
    userMessage?: string;
  };

  if (!image) {
    return res.status(400).json({ error: "Se requiere el campo 'image' en base64" });
  }

  // Validación básica de tamaño (max ~5MB en base64 ≈ ~3.75MB real)
  if (image.length > 7_000_000) {
    return res.status(413).json({ error: "Imagen demasiado grande. Máximo 5MB." });
  }

  try {
    // 1. Cargar perfiles en paralelo
    const [profile, personalityProfile] = await Promise.all([
      prisma.partnerProfile.findUnique({ where: { userId } }),
      prisma.personalityProfile.findUnique({ where: { userId } }),
    ]);

    if (!profile?.lastPeriodDate) {
      return res.status(422).json({ error: "Perfil de pareja incompleto (falta ciclo)" });
    }

    // 2. Analizar foto con DeepFace (con fallback si el VPS no responde)
    let vision: VisionContext;
    try {
      vision = await analyzePartnerPhoto(image);
    } catch (visionError) {
      console.warn("[Vision] DeepFace no disponible, usando contexto neutro:", visionError);
      vision = neutralVisionContext();
    }

    // 3. Calcular estado del ciclo
    const cycle = calculateCycleState(
      profile.lastPeriodDate,
      profile.cycleLength,
      profile.periodDuration
    );

    // 4. Construir system prompt CON el bloque visual inyectado
    const systemPrompt = buildSystemPrompt({
      phase: cycle.phase,
      dayOfCycle: cycle.dayOfCycle,
      daysUntilNextPhase: cycle.daysUntilNextPhase,
      personalityType: profile.personalityType,
      socialLevel: profile.socialLevel,
      privacyLevel: profile.privacyLevel,
      conflictStyle: profile.conflictStyle,
      affectionStyle: profile.affectionStyle,
      mbtiType: personalityProfile?.mbtiType as MBTIType | undefined,
      attachmentStyle: personalityProfile?.attachmentStyle as AttachmentStyle | undefined,
      preferences: personalityProfile?.preferences as any,
      // ─── Bloque visual nuevo ───────────────────────────────────────────
      visionContext: vision,
    });

    // 5. Mensaje del usuario (o petición automática si no hay texto)
    const finalUserMessage =
      userMessage?.trim() ||
      "Acabo de subir una foto de mi pareja. Dame el consejo táctico exacto para este momento.";

    const messages = [
      { role: "user" as const, content: finalUserMessage },
    ];

    // 6. Llamar a la IA con el sistema enriquecido
    const tier = detectTier(finalUserMessage);
    const aiResponse = await routeToAI(systemPrompt, messages, tier);

    // 7. Responder — NUNCA devolvemos la imagen ni el JSON de DeepFace al cliente
    return res.json({
      response: aiResponse,
      visionUsed: true,
      emotionDetected: vision.dominantEmotion,
      fromCache: false,
    });

  } catch (error) {
    console.error("[Vision] Error en vision-chat:", error);
    return res.status(500).json({ error: "Error interno al procesar la imagen" });
  }
};

/**
 * POST /api/ai/calibrate-profile
 * Analiza una foto de referencia para establecer los gustos y estilo base de la pareja.
 */
export const handleProfileCalibration = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: "No autenticado" });

  const { image } = req.body as { image?: string };
  if (!image) return res.status(400).json({ error: "Se requiere imagen" });

  try {
    // 1. Analizar con DeepFace v2.0
    const vision = await analyzePartnerPhoto(image);

    // 2. Extraer rasgos persistentes
    const inferredTraits = {
      detectedStyle: vision.style,
      clothingTone: vision.clothingTone,
      estimatedAge: vision.estimatedAge,
      // Guardamos la fecha de calibración
      lastCalibration: new Date().toISOString(),
    };

    // 3. Actualizar el perfil de personalidad (campo preferences Json)
    const personality = await prisma.personalityProfile.findUnique({ where: { userId } });
    const currentPrefs = (personality?.preferences as any) || {};

    await prisma.personalityProfile.upsert({
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

    return res.json({
      success: true,
      traits: inferredTraits,
      message: "Perfil calibrado con éxito basado en la lectura visual."
    });

  } catch (error) {
    console.error("[Vision] Error en calibración:", error);
    return res.status(500).json({ error: "Error al calibrar perfil" });
  }
};
