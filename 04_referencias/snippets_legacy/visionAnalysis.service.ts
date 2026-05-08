/**
 * visionAnalysis.service.ts
 *
 * Responsabilidad única: llamar al servidor DeepFace en el VPS
 * y devolver un objeto VisionContext listo para inyectar en el promptEngine.
 *
 * Ubicación: matecare-backend/src/services/visionAnalysis.service.ts
 */

export interface VisionContext {
  dominantEmotion: string;    // "alegria" | "tristeza" | "irritabilidad" | "calma" | ...
  energyAppearance: string;   // "alta" | "media" | "baja"
  environment: string;        // heurística: "hogar" | "exterior" | "trabajo"
  style: string;              // heurística: siempre "desconocido" sin CV avanzado
  rawEmotions?: Record<string, number>;
}

interface DeepFaceResponse {
  dominantEmotion: string;
  allEmotions: Record<string, number>;
  energyAppearance: string;
  estimatedAge: number;
  gender: string;
  environment: null;
  style: null;
}

const DEEPFACE_URL = process.env.DEEPFACE_URL ?? "http://localhost:5001";
const DEEPFACE_TOKEN = process.env.DEEPFACE_TOKEN ?? "matecare-internal-secret";
const TIMEOUT_MS = 12_000; // DeepFace puede tardar ~5s en frío

/**
 * Analiza una imagen y devuelve el contexto visual para el promptEngine.
 * @param imageBase64 - Imagen en base64 (con o sin prefijo data:image/...)
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
      throw new Error(`DeepFace error ${res.status}: ${JSON.stringify(err)}`);
    }

    const data: DeepFaceResponse = await res.json();

    return {
      dominantEmotion: data.dominantEmotion,
      energyAppearance: data.energyAppearance,
      environment: inferEnvironment(data),  // heurística simple
      style: "desconocido",                 // DeepFace base no infiere ropa
      rawEmotions: data.allEmotions,
    };

  } finally {
    clearTimeout(timer);
  }
}

/**
 * Heurística básica: en ausencia de análisis de contexto visual complejo,
 * asumimos "hogar" como entorno más probable para el caso de uso de MateCare.
 * En una v2 se puede añadir un modelo de clasificación de escena.
 */
function inferEnvironment(_data: DeepFaceResponse): string {
  // TODO v2: clasificar el fondo de la imagen con un modelo de escena
  return "hogar";
}

/**
 * Versión fallback: si DeepFace no responde, devuelve contexto neutro
 * para que el promptEngine no se rompa.
 */
export function neutralVisionContext(): VisionContext {
  return {
    dominantEmotion: "calma",
    energyAppearance: "media",
    environment: "hogar",
    style: "desconocido",
  };
}
