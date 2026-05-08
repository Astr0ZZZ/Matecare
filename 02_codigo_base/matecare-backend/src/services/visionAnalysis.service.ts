/**
 * visionAnalysis.service.ts
 *
 * Responsabilidad única: llamar al servidor DeepFace v2.0 en el VPS
 * y devolver un objeto VisionContext enriquecido.
 *
 * Ubicación: matecare-backend/src/services/visionAnalysis.service.ts
 */

export interface VisionContext {
  // Campos base (v1 compat)
  dominantEmotion: string;
  energyAppearance: string;
  environment: string;
  style: string;

  // Campos enriquecidos (v2)
  allEmotions?: Record<string, number>;
  faceConfidence?: number;
  estimatedAge?: number;
  bodyLanguage?: string;
  activityLevel?: string;
  isIndoor?: boolean;
  sceneCategory?: string;
  lightCondition?: string;
  timeOfDayHint?: string;
  ambientMood?: string;
  clothingTone?: string;
  poseDetected?: boolean;
  analysisVersion?: string;
  processingMs?: number;
}

const DEEPFACE_URL = process.env.DEEPFACE_URL ?? "http://localhost:5001";
const DEEPFACE_TOKEN = process.env.DEEPFACE_TOKEN ?? "matecare-internal-secret";
const TIMEOUT_MS = 15_000; // v2.0 puede tardar un poco más por las capas en paralelo

/**
 * Analiza una imagen con el servidor v2.0 y devuelve el contexto visual completo.
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
      const err = await res.json().catch(() => ({}));
      throw new Error(`DeepFace v2 error ${res.status}: ${JSON.stringify(err)}`);
    }

    const data = await res.json();
    return data as VisionContext;

  } finally {
    clearTimeout(timer);
  }
}

/**
 * Versión fallback: si DeepFace no responde, devuelve contexto neutro.
 */
export function neutralVisionContext(): VisionContext {
  return {
    dominantEmotion: "calma",
    energyAppearance: "media",
    environment: "hogar",
    style: "casual",
    bodyLanguage: "relajada",
    lightCondition: "artificial_calida",
    ambientMood: "neutro",
    analysisVersion: "2.0-fallback",
  };
}
