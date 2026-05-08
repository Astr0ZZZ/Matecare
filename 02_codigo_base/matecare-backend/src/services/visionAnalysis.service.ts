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

    const data = await res.json();
    recordSuccess();
    return data as VisionContext;

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
    estimated_style: "Casual/Comfort",
    social_energy: "Medium",
    emotional_tone: "Calm",
    visual_discrepancy: false,
    tactical_confidence: 0.5,
    fatigue_signal: "low",
    environment_context: "unknown",
    color_mood: "neutral",
    head_tilt_signal: "neutral",
    suppression_detected: false
  };
}
