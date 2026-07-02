import { describe, expect, test } from 'vitest';

import {
  buildLoanAnalysis,
  calculateEmi,
  createSchedule,
  getEffectiveMonthIndex,
  type LoanConfig,
} from './loanEngine';

const baseConfig: LoanConfig = {
  principal: 3_000_000,
  originalRate: 8.7,
  tenureMonths: 180,
  startDate: '2024-09-01',
  rateChanges: [],
  partPayments: [],
};

const defaultConfig: LoanConfig = {
  ...baseConfig,
  preEmiInterest: 14_301,
  rateChanges: [
    { date: '2025-03-01', rate: 8.45 },
    { date: '2025-05-01', rate: 8.2 },
    { date: '2025-07-01', rate: 7.7 },
    { date: '2026-01-01', rate: 7.45 },
  ],
  partPayments: [
    { date: '2026-01-08', amount: 200_000 },
    { date: '2026-02-17', amount: 200_000 },
    { date: '2026-03-18', amount: 200_000 },
    { date: '2026-04-18', amount: 150_000 },
    { date: '2026-05-20', amount: 150_000 },
    { date: '2026-06-19', amount: 200_000 },
  ],
};

describe('loan engine', () => {
  test('calculates a clean 15-year reducing-balance amortization schedule to the rupee', () => {
    const schedule = createSchedule(baseConfig);

    expect(Math.round(calculateEmi(3_000_000, 8.7, 180))).toBe(29_895);
    expect(Math.round(calculateEmi(1_000_000, 7.2, 120))).toBe(11_714);
    expect(schedule.summary.totalMonths).toBe(180);
    expect(Math.round(schedule.summary.baseEmi)).toBe(29_895);
    expect(Math.round(schedule.summary.totalInterest)).toBe(2_381_090);
    expect(Math.round(schedule.rows[0]?.interest ?? 0)).toBe(21_750);
    expect(Math.round(schedule.rows[0]?.principal ?? 0)).toBe(8_145);
    expect(Math.round(schedule.rows[0]?.openingBalance ?? 0)).toBe(3_000_000);
    expect(Math.round(schedule.rows[0]?.closingBalance ?? 0)).toBe(2_991_855);
    expect(Math.round(schedule.rows.at(-1)?.closingBalance ?? -1)).toBe(0);
  });

  test('applies a rate drop from the effective month while keeping the original EMI', () => {
    const schedule = createSchedule({
      ...baseConfig,
      rateChanges: [{ date: '2025-03-01', rate: 7.7 }],
    });

    const february = schedule.rows[5];
    const march = schedule.rows[6];

    expect(february?.rate).toBe(8.7);
    expect(march?.rate).toBe(7.7);
    expect(Math.round(march?.emi ?? 0)).toBe(29_895);
    expect(Math.round(march?.interest ?? 0)).toBe(18_931);
    expect(schedule.summary.totalMonths).toBeLessThan(180);
    expect(schedule.summary.totalInterest).toBeLessThan(
      createSchedule(baseConfig).summary.totalInterest,
    );
  });

  test('charges simple interest on a mid-month prepayment and reduces the closing balance', () => {
    const withoutPrepayment = createSchedule(baseConfig);
    const withPrepayment = createSchedule({
      ...baseConfig,
      partPayments: [{ date: '2025-03-08', amount: 200_000 }],
    });

    const marchWithoutPrepayment = withoutPrepayment.rows[6];
    const marchWithPrepayment = withPrepayment.rows[6];

    expect(marchWithPrepayment?.prepayment).toBe(200_000);
    // Interest is computed on the full opening balance (EMI on the 1st, before the prepayment).
    expect(Math.round(marchWithPrepayment?.interest ?? 0)).toBe(
      Math.round(marchWithoutPrepayment?.interest ?? 0),
    );
    // Simple interest on the prepaid amount for days 2..7 at 8.7%.
    expect(marchWithPrepayment?.simpleInterest ?? 0).toBeCloseTo(286.03, 1);
    // The prepayment reduces the closing balance, not the current month's interest.
    expect(Math.round(marchWithPrepayment?.closingBalance ?? 0)).toBe(2_741_730);
    expect(Math.round(marchWithPrepayment?.closingBalance ?? 0)).toBeLessThan(
      Math.round(marchWithoutPrepayment?.closingBalance ?? 0),
    );
    expect(Math.round(marchWithPrepayment?.emi ?? 0)).toBe(29_895);
    expect(withPrepayment.summary.totalMonths).toBeLessThan(withoutPrepayment.summary.totalMonths);
  });

  test('computes the full default scenario against the validated HDFC app numbers', () => {
    const analysis = buildLoanAnalysis(defaultConfig, '2026-07-02');
    const rateMonths = analysis.rateImpacts.reduce((sum, item) => sum + item.monthsSaved, 0);
    const prepaymentMonths = analysis.partPaymentImpacts.reduce(
      (sum, item) => sum + item.monthsSaved,
      0,
    );

    expect(analysis.original.summary.totalMonths).toBe(180);
    expect(analysis.actual.summary.totalMonths).toBe(90);
    expect(analysis.monthsSaved).toBe(rateMonths + prepaymentMonths);
    expect(analysis.monthsSaved).toBe(90);
    expect(Math.round(analysis.actual.summary.totalPrepayment)).toBe(1_100_000);
    expect(Math.round(analysis.actual.summary.totalSimpleInterest)).toBe(3_245);
    expect(analysis.actual.summary.preEmiInterest).toBe(14_301);
    expect(Math.round(analysis.actual.summary.totalInterest)).toBe(803_863);
    expect(Math.round(analysis.interestSaved)).toBe(1_591_527);
    expect(Math.round(analysis.outstanding)).toBe(1_651_369);
    expect(Math.round(analysis.actual.summary.totalOutflow)).toBe(3_803_863);
    expect(Math.round(analysis.actual.rows.at(-1)?.emi ?? 0)).toBe(25_667);
    expect(analysis.nextRow?.date).toBe('2026-07-31');
    expect(analysis.actual.summary.totalMonths - analysis.todayIndex).toBe(67);
    expect(analysis.rateImpacts.map((impact) => impact.monthsSaved)).toEqual([4, 5, 7, 3]);
    expect(analysis.partPaymentImpacts.map((impact) => impact.monthsSaved)).toEqual([
      16, 14, 13, 9, 8, 11,
    ]);
  });

  test('normalizes mid-month rate changes to the next month and first-day changes to the same month', () => {
    expect(getEffectiveMonthIndex('2025-03-01', baseConfig.startDate, 'rate')).toBe(7);
    expect(getEffectiveMonthIndex('2025-03-02', baseConfig.startDate, 'rate')).toBe(8);
    expect(getEffectiveMonthIndex('2025-03-31', baseConfig.startDate, 'rate')).toBe(8);
  });

  test('applies a prepayment on the EMI date with no simple interest and reduces the closing balance', () => {
    const schedule = createSchedule({
      ...baseConfig,
      partPayments: [{ date: '2024-09-01', amount: 100_000 }],
    });

    const firstRow = schedule.rows[0];

    expect(firstRow?.prepayment).toBe(100_000);
    expect(Math.round(firstRow?.openingBalance ?? 0)).toBe(3_000_000);
    expect(Math.round(firstRow?.interest ?? 0)).toBe(21_750);
    expect(firstRow?.simpleInterest ?? 0).toBe(0);
    expect(Math.round(firstRow?.closingBalance ?? 0)).toBe(2_891_855);
  });

  test('allows a final EMI smaller than the regular EMI', () => {
    const schedule = createSchedule({
      ...baseConfig,
      partPayments: [{ date: '2024-09-01', amount: 2_990_000 }],
    });

    expect(schedule.summary.totalMonths).toBe(2);
    expect(Math.round(schedule.rows.at(-1)?.emi ?? 0)).toBeLessThan(
      Math.round(schedule.summary.baseEmi),
    );
    expect(Math.round(schedule.rows.at(-1)?.closingBalance ?? -1)).toBe(0);
  });
});
