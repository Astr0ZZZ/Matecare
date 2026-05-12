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
const FAILURE_THRESHOLD = 4;
const RECOVERY_TIMEOUT_MS = 60_000;

function checkCircuit(): boolean {
  if (!circuitState.isOpen) return true;
  const elapsed = Date.now() - circuitState.lastFailure;
  if (elapsed > RECOVERY_TIMEOUT_MS) {
    circuitState.isOpen = false;
    circuitState.failures = 0;
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
    console.warn(`[Vision] Circuit breaker ABIERTO — VPS no disponible`);
  }
}

export async function analyze(imageBase64: string): Promise<VisionContext> {
  if (!checkCircuit()) {
    throw new Error('Vision service circuit breaker open');
  }

  const controller = new AbortController();
  // El fallback de 900ms se maneja en el orquestador, pero aquí ponemos un timeout de seguridad
  const timer = setTimeout(() => controller.abort(), 5000);

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

    // NORMALIZACIÓN V3.0: Traducir del idioma Python al idioma Prisma/IA
    const normalizedData: VisionContext = {
      ...neutralVisionContext(),
      ...rawData,
      // Mapeo Crítico: Python -> Backend
      dominantEmotion: rawData.emotional_tone || rawData.dominant_emotion || "Neutral",
      visualStyle: rawData.estimated_style || rawData.visual_style || "Casual",
      environment: rawData.environment_context || rawData.environment || "Home",
      isSuppressed: rawData.suppression_detected || false,
      hasDiscrepancy: rawData.visual_discrepancy || false,
      confidence: rawData.tactical_confidence || 0.5
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

