export interface VisionContext {
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
}
