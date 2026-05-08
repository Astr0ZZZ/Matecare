/**
 * visionAnalysis.service.ts
 *
 * Responsabilidad: Llamar al VPS de DeepFace y normalizar la respuesta
 * con lógica de resiliencia y manejo de múltiples rostros.
 */

export interface VisionContext {
  dominantEmotion: string;
  emotionConfidence: number;
  estimatedAge: number;
  gender: 'male' | 'female' | 'unknown';
  faceDetected: boolean;
  analyzedAt: string;
  rawEmotions: Record<string, number>;
  
  // Campos v1 compat (para no romper el resto de la app)
  energyAppearance: string;
  environment: string;
  style: string;
}

const DEEPFACE_URL = process.env.DEEPFACE_URL ?? "http://localhost:5001";
const DEEPFACE_TOKEN = process.env.DEEPFACE_TOKEN ?? "matecare-internal-secret";
const TIMEOUT_MS = 15_000; 

/**
 * Normaliza la respuesta cruda del VPS a nuestro contrato VisionContext
 */
function parseDeepFaceResponse(raw: any): VisionContext {
  // DeepFace v2 devuelve un array si detecta rostros, o un objeto si es v1
  const face = Array.isArray(raw) ? raw[0] : raw;

  if (!face || (!face.dominant_emotion && !face.emotion)) {
    return neutralVisionContext();
  }

  const dominant = face.dominant_emotion || "neutral";
  const confidence = Math.round(face.emotion?.[dominant] || 0);
  
  // Mapeo de género
  let gender: 'male' | 'female' | 'unknown' = 'unknown';
  if (face.gender) {
    gender = face.gender.Woman > face.gender.Man ? 'female' : 'male';
  }

  return {
    dominantEmotion: dominant,
    emotionConfidence: confidence,
    estimatedAge: Math.round(face.age || 25),
    gender,
    faceDetected: true,
    analyzedAt: new Date().toISOString(),
    rawEmotions: face.emotion || {},
    
    // Fallbacks para compatibilidad con promptEngine antiguo
    energyAppearance: confidence > 60 ? "alta" : "media",
    environment: "hogar",
    style: "casual"
  };
}

/**
 * Analiza una imagen con el servidor v2.0
 */
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

    if (!res.ok) {
      throw new Error(`DeepFace server error: ${res.status}`);
    }

    const data = await res.json();
    return parseDeepFaceResponse(data);

  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.warn("[VISION] Timeout alcanzado, usando contexto neutro");
    } else {
      console.error("[VISION] Error en análisis:", error.message);
    }
    return neutralVisionContext();
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Versión fallback: contexto neutro de seguridad
 */
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
