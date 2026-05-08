// Motor de ciclo — lógica pura de fechas, sin IA
// Referencia: MateCare_arquitectura_tecnica.md sección 5

export type CyclePhase = 'MENSTRUAL' | 'FOLLICULAR' | 'OVULATION' | 'LUTEAL'

export interface CycleState {
  dayOfCycle: number
  phase: CyclePhase
  daysUntilNextPhase: number
  daysUntilNextPeriod: number
}

/**
 * Calcula el estado actual del ciclo menstrual basado en datos biológicos.
 * 
 * Rangos definidos:
 * - MENSTRUAL: Día 1 al día periodDuration.
 * - OVULATION: Ventana fértil de 5 días (cycleLength - 16 hasta cycleLength - 12).
 * - FOLLICULAR: Espacio entre MENSTRUAL y OVULATION.
 * - LUTEAL: Espacio entre OVULATION y el final del ciclo.
 */
export function calculateCycleState(
  lastPeriodDate: Date,
  cycleLength: number,
  periodDuration: number
): CycleState {
  const today = new Date();
  
  // Normalizar fechas a medianoche UTC para evitar problemas con zonas horarias/horas
  const start = new Date(lastPeriodDate);
  start.setUTCHours(0, 0, 0, 0);
  const current = new Date(today);
  current.setUTCHours(0, 0, 0, 0);

  const msPerDay = 1000 * 60 * 60 * 24;
  const diffInMs = current.getTime() - start.getTime();
  const diffInDays = Math.floor(diffInMs / msPerDay);
  
  // Día del ciclo (1-indexed) usando módulo para ciclos repetitivos
  let dayOfCycle = (diffInDays % cycleLength) + 1;
  if (dayOfCycle <= 0) dayOfCycle += cycleLength; // Manejar fechas pasadas/futuras

  const ovulationStart = cycleLength - 16;
  const ovulationEnd = cycleLength - 12;

  let phase: CyclePhase;
  let daysUntilNextPhase: number;

  if (dayOfCycle <= periodDuration) {
    phase = 'MENSTRUAL';
    daysUntilNextPhase = periodDuration - dayOfCycle + 1;
  } else if (dayOfCycle < ovulationStart) {
    phase = 'FOLLICULAR';
    daysUntilNextPhase = ovulationStart - dayOfCycle;
  } else if (dayOfCycle <= ovulationEnd) {
    phase = 'OVULATION';
    daysUntilNextPhase = ovulationEnd - dayOfCycle + 1;
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

/**
 * Módulo de anticipación (48h antes de LUTEAL)
 */
export function getLutealWarning(daysUntilLuteal: number): string | null {
  if (daysUntilLuteal <= 2 && daysUntilLuteal > 0) {
    return `⚠️ AVISO TÁCTICO: Fase Lútea en ${daysUntilLuteal} día${daysUntilLuteal === 1 ? '' : 's'}. Despeja su agenda, cierra pendientes y evita conversaciones difíciles este fin de semana.`;
  }
  return null;
}
