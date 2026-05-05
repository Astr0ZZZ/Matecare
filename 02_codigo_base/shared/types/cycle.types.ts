export type CyclePhase = 'MENSTRUAL' | 'FOLLICULAR' | 'OVULATION' | 'LUTEAL'

export interface CycleState {
  dayOfCycle: number
  phase: CyclePhase
  daysUntilNextPhase: number
  daysUntilNextPeriod: number
}
