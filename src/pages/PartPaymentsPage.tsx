import { Plus, Trash2 } from 'lucide-react';

import { Card, StatCard } from '../components/Primitives';
import type { LoanAnalysis, PartPayment } from '../features/loan/loanEngine';
import { formatDuration, formatInrShort, formatMonthYear } from '../utils/format';

type PartPaymentsPageProps = {
  analysis: LoanAnalysis;
  partPayments: PartPayment[];
  onChange: (partPayments: PartPayment[]) => void;
};

/**
 * Renders the part-payment ledger and impact page.
 *
 * @param props - Part-payment page props.
 * @param props.analysis - Loan analysis containing prepayment impacts.
 * @param props.partPayments - Editable prepayment list.
 * @param props.onChange - Callback for persisting prepayments.
 * @returns Part payments page element.
 */
export function PartPaymentsPage({ analysis, partPayments, onChange }: PartPaymentsPageProps) {
  const totalMonths = analysis.partPaymentImpacts.reduce((sum, item) => sum + item.monthsSaved, 0);
  const totalInterest = analysis.partPaymentImpacts.reduce(
    (sum, item) => sum + item.interestSaved,
    0,
  );

  return (
    <div className="content">
      <div className="kpi-grid">
        <StatCard label="Prepayments" value={partPayments.length} />
        <StatCard
          label="Total prepaid"
          value={formatInrShort(analysis.actual.summary.totalPrepayment)}
        />
        <StatCard label="Months saved" value={totalMonths} detail={formatDuration(totalMonths)} />
        <StatCard label="Interest avoided" value={formatInrShort(totalInterest)} />
      </div>

      <div className="section-grid">
        <Card
          eyebrow="Prepayment ledger"
          title="All part payments"
          action={
            <button
              className="btn btn-primary"
              onClick={() =>
                onChange(sortPayments([...partPayments, { date: '2026-09-01', amount: 200_000 }]))
              }
            >
              <Plus size={16} />
              Add prepayment
            </button>
          }
        >
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th className="numeric">Amount</th>
                  <th className="numeric">Months saved</th>
                  <th className="numeric">Interest saved</th>
                  <th className="numeric">Effective ROI</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {partPayments.map((payment, index) => {
                  const impact = analysis.partPaymentImpacts[index];
                  const interestSaved = impact?.interestSaved ?? 0;
                  const roi = payment.amount > 0 ? (interestSaved / payment.amount) * 100 : 0;

                  return (
                    <tr key={`${payment.date}-${index}`}>
                      <td>
                        <input
                          className="input min-w-40"
                          type="date"
                          value={payment.date}
                          onChange={(event) =>
                            updatePayment(
                              partPayments,
                              index,
                              { date: event.target.value },
                              onChange,
                            )
                          }
                        />
                      </td>
                      <td className="numeric">
                        <input
                          className="input min-w-32 text-right"
                          type="number"
                          step="10000"
                          value={payment.amount}
                          onChange={(event) =>
                            updatePayment(
                              partPayments,
                              index,
                              { amount: Number(event.target.value) },
                              onChange,
                            )
                          }
                        />
                      </td>
                      <td className="numeric font-bold">{impact?.monthsSaved ?? 0}</td>
                      <td className="numeric font-bold text-[var(--jade)]">
                        {formatInrShort(interestSaved)}
                      </td>
                      <td className="numeric">
                        <span className="chip chip-jade">{roi.toFixed(0)}%</span>
                      </td>
                      <td>
                        <button
                          className="icon-btn"
                          onClick={() => removePayment(partPayments, index, onChange)}
                          aria-label="Delete prepayment"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        <Card
          eyebrow="Compounding effect"
          title={`${formatInrShort(analysis.actual.summary.totalPrepayment)} → ${formatInrShort(totalInterest)} saved`}
        >
          <div className="grid gap-4">
            {partPayments.map((payment, index) => {
              const impact = analysis.partPaymentImpacts[index];
              const ratio = payment.amount > 0 ? (impact?.interestSaved ?? 0) / payment.amount : 0;

              return (
                <div key={`${payment.date}-bar`}>
                  <div className="mb-2 flex justify-between gap-3 text-sm font-bold">
                    <span>
                      {formatMonthYear(payment.date)} · {formatInrShort(payment.amount)}
                    </span>
                    <span className="text-[var(--jade)]">
                      +{formatInrShort(impact?.interestSaved ?? 0)}
                    </span>
                  </div>
                  <div className="flex h-2 overflow-hidden rounded-full">
                    <div className="bg-[var(--violet)]" style={{ flex: 1 }} />
                    <div className="bg-[var(--jade)]" style={{ flex: Math.max(0.05, ratio) }} />
                  </div>
                  <div className="subtle mt-1 flex justify-between text-xs">
                    <span>You paid</span>
                    <span>You saved {ratio.toFixed(2)}x</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}

function updatePayment(
  partPayments: PartPayment[],
  index: number,
  patch: Partial<PartPayment>,
  onChange: (partPayments: PartPayment[]) => void,
): void {
  onChange(
    sortPayments(
      partPayments.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
    ),
  );
}

function removePayment(
  partPayments: PartPayment[],
  index: number,
  onChange: (partPayments: PartPayment[]) => void,
): void {
  onChange(partPayments.filter((_, itemIndex) => itemIndex !== index));
}

function sortPayments(partPayments: PartPayment[]): PartPayment[] {
  return [...partPayments].sort((left, right) => left.date.localeCompare(right.date));
}
