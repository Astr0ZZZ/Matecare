import { calculateCycleState } from '../src/services/cycleEngine.service';

function testCycle(lastPeriodDaysAgo: number, cycleLength: number, periodDuration: number) {
  const lastPeriodDate = new Date();
  lastPeriodDate.setDate(lastPeriodDate.getDate() - lastPeriodDaysAgo);
  
  const state = calculateCycleState(lastPeriodDate, cycleLength, periodDuration);
  console.log(`Días desde periodo: ${lastPeriodDaysAgo} | Día Ciclo: ${state.dayOfCycle} | Fase: ${state.phase} | Faltan para sig: ${state.daysUntilNextPhase}`);
}

console.log("--- Testing Cycle Engine (Cycle: 28, Period: 5) ---");
for (let i = 0; i < 30; i++) {
  testCycle(i, 28, 5);
}
