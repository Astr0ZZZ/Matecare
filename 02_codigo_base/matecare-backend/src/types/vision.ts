export interface VisionContext {
  estimated_style: string;          // "Casual/Comfort" | "Social" | "Formal" | "Sport"
  social_energy: string;            // "Low (Recharging)" | "Medium" | "High"
  emotional_tone: string;           // "Suppressed Fatigue" | "Genuine Joy" | "Stress" | "Calm"
  visual_discrepancy: boolean;      // sonrisa + postura cerrada = true
  tactical_confidence: number;      // 0.0 - 1.0
  // NUEVOS
  fatigue_signal: "high" | "medium" | "low";  // del EAR de Mediapipe
  environment_context: "work_stress" | "rest_comfort" | "social_active" | "unknown";
  color_mood: "warm_energized" | "cool_stressed" | "dark_withdrawn" | "neutral";
  head_tilt_signal: "open" | "neutral" | "withdrawn";
  suppression_detected: boolean;    // emoción positiva + fatiga alta = true
}
