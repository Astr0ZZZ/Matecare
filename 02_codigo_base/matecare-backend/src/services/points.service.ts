export const POINTS_ECONOMY = {
  MISSION_COMPLETED: 10,
  EVIDENCE_UPLOADED: 50,
  STREAK_BONUS: 20,
};

export function calculatePoints(action: keyof typeof POINTS_ECONOMY): number {
  return POINTS_ECONOMY[action] || 0;
}
