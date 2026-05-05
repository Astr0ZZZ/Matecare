import { calculateCycleState } from '../cycleEngine.service';

describe('cycleEngine.service', () => {
  const msPerDay = 1000 * 60 * 60 * 24;

  const getToday = () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  };

  test('Cycle 28 days - Day 1 (Menstrual)', () => {
    const lastPeriod = getToday();
    const result = calculateCycleState(lastPeriod, 28, 5);
    expect(result.dayOfCycle).toBe(1);
    expect(result.phase).toBe('MENSTRUAL');
    expect(result.daysUntilNextPhase).toBe(5);
  });

  test('Cycle 28 days - Day 7 (Follicular)', () => {
    const lastPeriod = new Date(getToday().getTime() - 6 * msPerDay);
    const result = calculateCycleState(lastPeriod, 28, 5);
    expect(result.dayOfCycle).toBe(7);
    expect(result.phase).toBe('FOLLICULAR');
    expect(result.daysUntilNextPhase).toBe(7); // 14 - 7
  });

  test('Cycle 28 days - Day 14 (Ovulation)', () => {
    const lastPeriod = new Date(getToday().getTime() - 13 * msPerDay);
    const result = calculateCycleState(lastPeriod, 28, 5);
    expect(result.dayOfCycle).toBe(14);
    expect(result.phase).toBe('OVULATION');
  });

  test('Cycle 28 days - Day 20 (Luteal)', () => {
    const lastPeriod = new Date(getToday().getTime() - 19 * msPerDay);
    const result = calculateCycleState(lastPeriod, 28, 5);
    expect(result.dayOfCycle).toBe(20);
    expect(result.phase).toBe('LUTEAL');
  });

  test('Cycle 21 days - Day 10 (Ovulation - scaled)', () => {
    const lastPeriod = new Date(getToday().getTime() - 9 * msPerDay);
    const result = calculateCycleState(lastPeriod, 21, 4);
    expect(result.dayOfCycle).toBe(10); // floor(21/2) = 10
    expect(result.phase).toBe('OVULATION');
  });

  test('Cycle 35 days - Day 17 (Ovulation - scaled)', () => {
    const lastPeriod = new Date(getToday().getTime() - 16 * msPerDay);
    const result = calculateCycleState(lastPeriod, 35, 6);
    expect(result.dayOfCycle).toBe(17); // floor(35/2) = 17
    expect(result.phase).toBe('OVULATION');
  });
});
