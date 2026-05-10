import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { calculateCycleState } from "../services/cycleEngine.service";
import {
  analyzePartnerPhoto,
  neutralVisionContext,
  type VisionContext,
} from "../services/visionAnalysis.service";
import { processChat, Message, VISION_TRANSLATIONS, humanize } from "../services/ai.service";



interface AuthRequest extends Request {
  user?: { id: string };
}

/**
 * POST /api/ai/vision-chat
 * 
 * Flujo v3.0: 
 * 1. Recibe imagen + mensaje
 * 2. Orquestador (ai.service) maneja Visión + Agente 1 + Agente 2
 * 3. Persiste el registro emocional
 * 4. Retorna respuesta táctica
 */
export const handleVisionChat = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: "No autenticado" });

  const { image, userMessage } = req.body as { image?: string; userMessage?: string; };
  if (!image) return res.status(400).json({ error: "Se requiere el campo 'image' en base64" });

  try {
    // 1. Obtener perfil para el contexto del ciclo
    const profile = await prisma.partnerProfile.findUnique({ where: { userId } });
    if (!profile?.lastPeriodDate) {
      return res.status(422).json({ error: "Perfil de pareja incompleto (falta ciclo)" });
    }

    const finalUserMessage = userMessage?.trim() || "Acabo de subir una foto de mi pareja. Dame el consejo táctico exacto para este momento.";

    // 2. Procesar con el sistema de dos agentes
    // processChat ahora nos devuelve tanto la respuesta como la visión técnica calculada
    const { response: aiResponse, vision: computedVision } = await processChat(userId, finalUserMessage, image, []);

    // 3. Fallback de visión si algo salió mal en la IA (aunque processChat debería manejarlo)
    const vision = computedVision || neutralVisionContext();


    // 4. PERSISTENCIA TÁCTICA: Guardamos en los nuevos campos de PartnerProfile
    try {
      await prisma.partnerProfile.update({
        where: { userId },
        data: {
          visualStyle: humanize(vision.environment_context),
          visionAnalysis: vision,
        } as any
      });

      console.log(`[Vision] Memoria visual actualizada en PartnerProfile para ${userId}`);
    } catch (e) {
      console.error("[Vision] Error persistiendo en PartnerProfile:", e);
    }


    // 5. Guardar en el historial emocional (independiente del perfil)
    await prisma.emotionalRecord.create({
      data: {
        userId,
        dominantEmotion: vision.emotional_tone,
        confidence: vision.tactical_confidence,
        isAuthentic: !vision.visual_discrepancy,
        isSuppressed: vision.suppression_detected,
        hasDiscrepancy: vision.visual_discrepancy,
        authenticityLabel: vision.emotional_tone,
        rawEmotions: { ...vision, v3_active: true } as any,
        phase: (await calculateCycleState(profile.lastPeriodDate, profile.cycleLength, profile.periodDuration)).phase,
        environment: vision.environment_context,
        analysisReliable: vision.tactical_confidence > 0.4
      }
    }).catch((e) => console.error("[Vision] Error guardando record emocional:", e));

    return res.json({
      response: aiResponse,
      vision: { ...vision, v3_active: true, debug_note: "SISTEMA V3 ACTIVO - DATOS SINCRONIZADOS" },
      state: await calculateCycleState(profile.lastPeriodDate, profile.cycleLength, profile.periodDuration)
    });

  } catch (error) {
    console.error("[VISION] Error crítico en vision-chat:", error);
    return res.status(500).json({ error: "Error interno al procesar la imagen" });
  }
};

/**
 * POST /api/ai/calibrate-profile
 * Calibración manual del perfil basada en una foto
 */
export const handleProfileCalibration = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  const { imageBase64 } = req.body;

  if (!userId) return res.status(401).json({ error: 'Usuario no autenticado' });
  if (!imageBase64) return res.status(400).json({ error: 'No se recibió la imagen (imageBase64)' });

  console.log(`[VISION] Calibrando perfil para usuario: ${userId}`);

  try {
    let vision: VisionContext;
    let calibrationMethod = 'VISION_ENGINE';

    try {
      vision = await analyzePartnerPhoto(imageBase64);
    } catch (visionError) {
      console.warn("[VISION] Vision Engine falló en calibración. Aplicando rasgos base.");
      vision = neutralVisionContext();
      calibrationMethod = 'FALLBACK_NEUTRAL';
    }

    const inferredTraits = {
      ...vision,
      calibrationMethod,
      lastCalibration: new Date().toISOString(),
    };

    await prisma.partnerProfile.update({
      where: { userId },
      data: {
        visualStyle: humanize(vision.environment_context),
        visionAnalysis: vision
      } as any
    });



    return res.json({
      success: true,
      traits: inferredTraits,
      message: calibrationMethod === 'VISION_ENGINE' 
        ? "Perfil calibrado con éxito basado en la lectura visual."
        : "Calibración completada con parámetros base."
    });

  } catch (error) {
    console.error("[VISION] Error fatal en calibración:", error);
    return res.status(500).json({ error: "Error al calibrar perfil" });
  }
};
