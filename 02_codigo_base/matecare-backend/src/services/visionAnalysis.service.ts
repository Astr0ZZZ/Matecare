/**
 * visionAnalysis.service.ts
 *
 * Responsabilidad: Llamar al VPS de Vision Engine v2.3 y normalizar la respuesta.
 * v3.0: Soporte para Deep Vision mejorado (Mediapipe, EAR, Head Tilt).
 */

import { VisionContext } from '../types/vision';
export { VisionContext };

const DEEPFACE_URL = process.env.DEEPFACE_URL ?? "http://localhost:5001";
const DEEPFACE_TOKEN = process.env.DEEPFACE_TOKEN ?? "matecare-internal-secret";

// Circuit Breaker
interface CircuitState {
  failures: number;
  lastFailure: number;
  isOpen: boolean;
}

const circuitState: CircuitState = { failures: 0, lastFailure: 0, isOpen: false };
const FAILURE_THRESHOLD = 10; // Más tolerante
const RECOVERY_TIMEOUT_MS = 30_000; // Recuperar más rápido

function checkCircuit(): boolean {
  if (!circuitState.isOpen) return true;
  const elapsed = Date.now() - circuitState.lastFailure;
  if (elapsed > RECOVERY_TIMEOUT_MS) {
    circuitState.isOpen = false;
    circuitState.failures = 0;
    console.log(`[Vision] Circuit breaker RE-INTENTANDO conexión...`);
    return true;
  }
  return false;
}

function recordSuccess() {
  circuitState.failures = 0;
}

function recordFailure() {
  circuitState.failures++;
  circuitState.lastFailure = Date.now();
  if (circuitState.failures >= FAILURE_THRESHOLD) {
    circuitState.isOpen = true;
    console.warn(`[Vision] Circuit breaker ABIERTO — VPS no disponible tras ${FAILURE_THRESHOLD} fallos`);
  }
}

export async function analyze(imageBase64: string): Promise<VisionContext> {
  if (!checkCircuit()) {
    throw new Error('Vision service circuit breaker open');
  }

  const controller = new AbortController();
  // Subimos a 15s porque YOLO + DeepFace + Places puede ser pesado en el primer arranque
  const timer = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(`${DEEPFACE_URL}/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Token': DEEPFACE_TOKEN,
      },
      body: JSON.stringify({ image: imageBase64 }),
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error(`Vision service error ${res.status}`);
    }

    const rawData = await res.json() as any;
    recordSuccess();

    // NORMALIZACIÓN V3.0: Traducir del idioma Python V2 al idioma Prisma/IA
    const normalizedData: VisionContext = {
      ...neutralVisionContext(),
      ...rawData, // Pasamos TODO lo que venga de Python (V2 puro)
      
      // Mapeo de Seguridad (Legacy): Para no romper componentes viejos
      emotional_tone: rawData.dominantEmotion === 'calma' ? 'Neutral' : (rawData.dominantEmotion || "Neutral"),
      environment_context: rawData.environment || rawData.sceneCategory || "Home",
      tactical_confidence: rawData.faceConfidence || 0.5,
      visual_discrepancy: rawData.hasDiscrepancy || false,
      suppression_detected: rawData.isSuppressed || false,
      estimated_style: rawData.style || rawData.clothingStyle || "Casual",

      // Campos Unificados V5 (Los que usa el Front y el Agente 1)
      dominantEmotion: rawData.dominantEmotion === 'calma' ? 'Neutral' : (rawData.dominantEmotion || "Neutral"),
      visualStyle: rawData.style || rawData.clothingStyle || "Casual",
      environment: rawData.environment || rawData.sceneCategory || "Home",
      isSuppressed: rawData.isSuppressed || false,
      hasDiscrepancy: rawData.hasDiscrepancy || false,
      confidence: rawData.faceConfidence || 0.5,

      // Inyectamos capas de profundidad directamente
      energyAppearance: rawData.energyAppearance,
      bodyLanguage: rawData.bodyLanguage,
      timeOfDayHint: rawData.timeOfDayHint,
      ambientMood: rawData.ambientMood,
      clothingTone: rawData.clothingTone,
      authenticityLabel: rawData.authenticityLabel || (rawData.dominantEmotion === 'calma' ? 'Neutral' : rawData.dominantEmotion)
    };

    return normalizedData;

  } catch (error: any) {
    recordFailure();
    throw error;
  } finally {
    clearTimeout(timer);
  }
}


export { analyze as analyzePartnerPhoto };

export function neutralVisionContext(): VisionContext {
  return {
    emotional_tone: "Neutral",
    physical_fatigue: "none",
    jaw_tension: 0,
    facial_signals: {
      ear: 0.3,
      jaw_tension: 0
    },
    pose_analysis: {
      posture: "Relaxed",
      head_tilt: "None"
    },
    environment_context: "Home",
    tactical_confidence: 0.5,
    visual_discrepancy: false,
    suppression_detected: false,
    estimated_style: "Casual",
    social_energy: "Medium"
  };
}

