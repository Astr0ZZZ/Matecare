export interface VisionContext {
  // Datos crudos de Python (Legacy/Technical)
  emotional_tone: string;
  physical_fatigue: "high" | "medium" | "low" | "none";
  jaw_tension: number | null;
  facial_signals: {
    ear: number | null;
    jaw_tension: number | null;
  };
  pose_analysis: {
    posture: string;
    head_tilt: string;
  };
  environment_context: string;
  tactical_confidence: number;
  visual_discrepancy: boolean;
  suppression_detected: boolean;
  estimated_style?: string;
  social_energy?: string;

  // Campos Normalizados (Prisma / IA v5.0)
  dominantEmotion?: string;
  visualStyle?: string;
  environment?: string;
  isSuppressed?: boolean;
  hasDiscrepancy?: boolean;
  confidence?: number;

  // Nuevos Campos V2 (Capas de Visión Paralela)
  energyAppearance?: string;
  bodyLanguage?: string;
  activityLevel?: string;
  isIndoor?: boolean;
  sceneCategory?: string;
  lightCondition?: string;
  timeOfDayHint?: string;
  ambientMood?: string;
  clothingTone?: string;
  authenticityLabel?: string;
  estimatedAge?: number;
  allEmotions?: Record<string, number>;
}
