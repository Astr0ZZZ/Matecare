/**
 * visionAnalysis.service.ts
 *
 * Responsabilidad: Llamar al VPS de DeepFace y normalizar la respuesta.
 * V2.1: Soporte para campos enriquecidos, autenticidad emocional y Circuit Breaker.
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

  // NUEVO v2.1 — Autenticidad emocional
  isAuthentic?: boolean | null;
  isSuppressed?: boolean;
  authenticityLabel?: string;
  hasDiscrepancy?: boolean;
  analysisReliable?: boolean;
  emotionalHistory?: string; // v2.1 — Resumen de tendencias
}

const DEEPFACE_URL = process.env.DEEPFACE_URL ?? "http://localhost:5001";
const DEEPFACE_TOKEN = process.env.DEEPFACE_TOKEN ?? "matecare-internal-secret";
const TIMEOUT_MS = 15_000; 

// Circuit Breaker — protege contra VPS caído
interface CircuitState {
  failures: number;
  lastFailure: number;
  isOpen: boolean;
}

const circuitState: CircuitState = { failures: 0, lastFailure: 0, isOpen: false };
const FAILURE_THRESHOLD = 4;
const RECOVERY_TIMEOUT_MS = 60_000; // 1 minuto

function checkCircuit(): boolean {
  if (!circuitState.isOpen) return true; // circuito cerrado = operacional

  const elapsed = Date.now() - circuitState.lastFailure;
  if (elapsed > RECOVERY_TIMEOUT_MS) {
    // Intentar recuperación
    circuitState.isOpen = false;
    circuitState.failures = 0;
    console.log('[Vision] Circuit breaker: intentando recuperación...');
    return true;
  }
  return false; // circuito abierto = no llamar al VPS
}

function recordSuccess() {
  circuitState.failures = 0;
}

function recordFailure() {
  circuitState.failures++;
  circuitState.lastFailure = Date.now();
  if (circuitState.failures >= FAILURE_THRESHOLD) {
    circuitState.isOpen = true;
    console.warn(`[Vision] Circuit breaker ABIERTO — VPS no disponible (${circuitState.failures} fallos)`);
  }
}

export async function analyzePartnerPhoto(imageBase64: string): Promise<VisionContext> {
  // Circuit breaker — si el VPS está caído, no bloqueamos
  if (!checkCircuit()) {
    console.warn('[Vision] Circuit breaker activo — devolviendo contexto neutro');
    return neutralVisionContext();
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

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
      // 422 = imagen rechazada por quality gate del VPS
      if (res.status === 422) {
        const err = (await res.json().catch(() => ({}))) as any;
        throw new ImageQualityError(err.reason || 'imagen_rechazada');
      }
      const err = (await res.json().catch(() => ({}))) as any;
      throw new Error(`DeepFace v2 error ${res.status}: ${JSON.stringify(err)}`);
    }

    const data = await res.json();
    recordSuccess();
    return data as VisionContext;

  } catch (error: any) {
    if (error instanceof ImageQualityError) {
      throw error; // No contar como fallo del VPS — es un rechazo intencional
    }
    recordFailure();
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

// Error específico para imágenes rechazadas por calidad
export class ImageQualityError extends Error {
  constructor(public reason: string) {
    super(`Imagen rechazada por calidad: ${reason}`);
    this.name = 'ImageQualityError';
  }
}

export function neutralVisionContext(): VisionContext {
  return {
    dominantEmotion: "calma",
    energyAppearance: "media",
    environment: "hogar",
    style: "casual",
    analysisVersion: "2.0-fallback"
  };
}
