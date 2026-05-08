/**
 * visionAnalysis.service.ts
 *
 * Responsabilidad: Llamar al VPS de DeepFace y normalizar la respuesta.
 * V2.1: Filtrado inteligente para priorizar el rostro de la pareja (mujer).
 */

export interface VisionContext {
  dominantEmotion: string;
  emotionConfidence: number;
  estimatedAge: number;
  gender: 'male' | 'female' | 'unknown';
  faceDetected: boolean;
  analyzedAt: string;
  rawEmotions: Record<string, number>;
  energyAppearance: string;
  environment: string;
  style: string;
}

const DEEPFACE_URL = process.env.DEEPFACE_URL ?? "http://localhost:5001";
const DEEPFACE_TOKEN = process.env.DEEPFACE_TOKEN ?? "matecare-internal-secret";
const TIMEOUT_MS = 15_000; 

/**
 * Normaliza la respuesta cruda del VPS.
 * Si hay múltiples rostros, selecciona el que tenga mayor probabilidad de ser mujer.
 */
function parseDeepFaceResponse(raw: any): VisionContext {
  let face = null;

  if (Array.isArray(raw)) {
    console.log(`[VISION] Se detectaron ${raw.length} rostros. Buscando a la pareja...`);
    // Priorizar rostro femenino (Woman > Man)
    face = raw.find(f => f.gender && f.gender.Woman > f.gender.Man);
    
    // Si no encuentra una mujer clara, toma el rostro con la emoción más "fuerte" o el primero
    if (!face) {
      console.log(`[VISION] No se detectó un rostro femenino claro, usando rostro principal.`);
      face = raw[0];
    }
  } else {
    face = raw;
  }

  if (!face || (!face.dominant_emotion && !face.emotion)) {
    return neutralVisionContext();
  }

  const dominant = face.dominant_emotion || "neutral";
  const confidence = Math.round(face.emotion?.[dominant] || 0);
  
  // Normalización de género
  let gender: 'male' | 'female' | 'unknown' = 'unknown';
  if (face.gender) {
    gender = face.gender.Woman > face.gender.Man ? 'female' : 'male';
  }

  console.log(`[VISION] Análisis finalizado: ${gender} - ${dominant} (${confidence}%)`);

  return {
    dominantEmotion: dominant,
    emotionConfidence: confidence,
    estimatedAge: Math.round(face.age || 25),
    gender,
    faceDetected: true,
    analyzedAt: new Date().toISOString(),
    rawEmotions: face.emotion || {},
    energyAppearance: confidence > 60 ? "alta" : "media",
    environment: "hogar",
    style: "casual"
  };
}

export async function analyzePartnerPhoto(imageBase64: string): Promise<VisionContext> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(`${DEEPFACE_URL}/analyze`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Token": DEEPFACE_TOKEN,
      },
      body: JSON.stringify({ image: imageBase64 }),
      signal: controller.signal,
    });

    if (!res.ok) throw new Error(`DeepFace error: ${res.status}`);

    const data = await res.json();
    return parseDeepFaceResponse(data);

  } catch (error: any) {
    console.error("[VISION] Error:", error.message);
    return neutralVisionContext();
  } finally {
    clearTimeout(timer);
  }
}

export function neutralVisionContext(): VisionContext {
  return {
    dominantEmotion: "neutral",
    emotionConfidence: 100,
    estimatedAge: 25,
    gender: "unknown",
    faceDetected: false,
    analyzedAt: new Date().toISOString(),
    rawEmotions: { neutral: 100 },
    energyAppearance: "media",
    environment: "hogar",
    style: "casual"
  };
}
