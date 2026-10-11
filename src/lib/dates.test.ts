import { describe, it, expect } from 'vitest';
import { getTodayDateString, resolvePeriodDates, formatDateBR } from './dates.js';

describe('dates', () => {
  it('retorna data no formato ISO YYYY-MM-DD', () => {
    const today = getTodayDateString('America/Sao_Paulo');
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('resolve períodos corretamente', () => {
    const todayPeriod = resolvePeriodDates('today');
    expect(todayPeriod.startDate).toBe(todayPeriod.endDate);

    const monthPeriod = resolvePeriodDates('this_month');
    expect(monthPeriod.startDate).toMatch(/^\d{4}-\d{2}-01$/);
    expect(monthPeriod.label).toBe('deste Mês');
  });

  it('formata data ISO para padrão brasileiro DD/MM/YYYY', () => {
    expect(formatDateBR('2026-10-15')).toBe('15/10/2026');
  });
});
