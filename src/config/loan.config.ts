import type { LoanConfig } from '../features/loan/loanEngine';

export const loanConfig: LoanConfig = {
  principal: 3_000_000,
  originalRate: 8.7,
  tenureMonths: 180,
  startDate: '2024-09-01',
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

export const today = '2026-07-02';
