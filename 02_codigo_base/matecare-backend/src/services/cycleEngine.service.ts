// Motor de ciclo — lógica pura de fechas, sin IA
// Referencia: MateCare_arquitectura_tecnica.md sección 5

export type CyclePhase = 'MENSTRUAL' | 'FOLLICULAR' | 'OVULATION' | 'LUTEAL'

export interface CycleState {
  dayOfCycle: number
  phase: CyclePhase
  daysUntilNextPhase: number
  daysUntilNextPeriod: number
}

export function calculateCycleState(
  lastPeriodDate: Date,
  cycleLength: number,
  periodDuration: number
): CycleState {
  const today = new Date();
  
  // Normalize dates to midnight to avoid issues with hours
  const start = new Date(lastPeriodDate);
  start.setHours(0, 0, 0, 0);
  const current = new Date(today);
  current.setHours(0, 0, 0, 0);

  const msPerDay = 1000 * 60 * 60 * 24;
  const diffInMs = current.getTime() - start.getTime();
  const diffInDays = Math.floor(diffInMs / msPerDay);
  
  // Day of cycle (1-indexed)
  const dayOfCycle = (diffInDays % cycleLength) + 1;

  // Calculate ovulation day (scaled to cycle length, standard is 14 for a 28-day cycle)
  const ovulationDay = Math.floor(cycleLength / 2);

  let phase: CyclePhase;
  let daysUntilNextPhase: number;

  if (dayOfCycle <= periodDuration) {
    phase = 'MENSTRUAL';
    daysUntilNextPhase = periodDuration - dayOfCycle + 1;
  } else if (dayOfCycle < ovulationDay) {
    phase = 'FOLLICULAR';
    daysUntilNextPhase = ovulationDay - dayOfCycle;
  } else if (dayOfCycle === ovulationDay) {
    phase = 'OVULATION';
    daysUntilNextPhase = 1; // Ovulation is usually 1 day in this model
  } else {
    phase = 'LUTEAL';
    daysUntilNextPhase = cycleLength - dayOfCycle + 1;
  }

  const daysUntilNextPeriod = cycleLength - dayOfCycle + 1;

  return {
    dayOfCycle,
    phase,
    daysUntilNextPhase,
    daysUntilNextPeriod
  };
}
