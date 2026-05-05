import { useMemo, useState } from 'react';

import { Card, StatCard } from '../components/Primitives';
import type { LoanAnalysis } from '../features/loan/loanEngine';
import { formatDuration, formatInr, formatInrShort, formatMonthYear } from '../utils/format';

type SchedulePageProps = {
  analysis: LoanAnalysis;
};

/**
 * Renders the full amortization schedule page.
 *
 * @param props - Schedule page props.
 * @param props.analysis - Loan analysis containing the actual schedule.
 * @returns Schedule page element.
 */
export function SchedulePage({ analysis }: SchedulePageProps) {
  const [year, setYear] = useState('all');
  const years = useMemo(
    () => Array.from(new Set(analysis.actual.rows.map((row) => row.date.slice(0, 4)))),
    [analysis.actual.rows],
  );
  const visibleRows = useMemo(
    () =>
      year === 'all'
        ? analysis.actual.rows
        : analysis.actual.rows.filter((row) => row.date.startsWith(year)),
    [analysis.actual.rows, year],
  );

  return (
    <div className="content">
      <div className="kpi-grid">
        <StatCard
          label="Total months"
          value={analysis.actual.summary.totalMonths}
          detail={`${formatDuration(analysis.monthsSaved)} saved vs 180`}
        />
        <StatCard
          label="EMI principal"
          value={formatInrShort(analysis.actual.summary.principalFromEmi)}
        />
        <StatCard
          label="Total interest"
          value={formatInrShort(analysis.actual.summary.totalInterest)}
          detail={`${formatInrShort(analysis.interestSaved)} saved`}
        />
        <StatCard
          label="Total outflow"
          value={formatInrShort(analysis.actual.summary.totalOutflow)}
          detail="EMIs plus prepayments"
        />
      </div>

      <Card
        className="mt-6"
        eyebrow="Full schedule"
        title={`${visibleRows.length} payments`}
        action={
          <select
            className="select w-36"
            value={year}
            onChange={(event) => setYear(event.target.value)}
          >
            <option value="all">All years</option>
            {years.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        }
      >
        <div className="table-wrap max-h-[560px]">
          <table className="table">
            <thead>
              <tr>
                <th>#</th>
                <th>Month</th>
                <th>Rate</th>
                <th className="numeric">EMI</th>
                <th className="numeric">Principal</th>
                <th className="numeric">Interest</th>
                <th className="numeric">Prepay</th>
                <th className="numeric">Balance</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row) => (
                <tr key={row.index}>
                  <td className="subtle">{row.index}</td>
                  <td className="font-semibold">{formatMonthYear(row.date)}</td>
                  <td>
                    <span className="chip">{row.rate.toFixed(2)}%</span>
                  </td>
                  <td className="numeric">{formatInr(row.emi)}</td>
                  <td className="numeric">{formatInr(row.principal)}</td>
                  <td className="numeric subtle">{formatInr(row.interest)}</td>
                  <td className="numeric">
                    {row.prepayment > 0 ? (
                      formatInr(row.prepayment)
                    ) : (
                      <span className="subtle">-</span>
                    )}
                  </td>
                  <td className="numeric font-bold">{formatInr(row.closingBalance)}</td>
                  <td>
                    {row.rateChanged && <span className="chip chip-orange">Rate change</span>}
                    {row.prepayment > 0 && (
                      <span className="chip chip-violet ml-2">Prepayment</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
