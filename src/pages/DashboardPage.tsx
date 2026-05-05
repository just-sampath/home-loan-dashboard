import { Calendar, IndianRupee, Percent, PiggyBank } from 'lucide-react';

import { BalanceChart, ImpactBarChart, MoneyDonut, PaymentHeatmap } from '../components/Charts';
import { Card, StatCard } from '../components/Primitives';
import type { LoanAnalysis } from '../features/loan/loanEngine';
import {
  formatDate,
  formatDuration,
  formatInr,
  formatInrShort,
  formatMonthYear,
} from '../utils/format';

type DashboardPageProps = {
  analysis: LoanAnalysis;
};

/**
 * Renders the dashboard overview page.
 *
 * @param props - Dashboard props.
 * @param props.analysis - Loan analysis used for KPIs and charts.
 * @returns Dashboard page element.
 */
export function DashboardPage({ analysis }: DashboardPageProps) {
  const progress = (analysis.paidPrincipal / analysis.actual.summary.totalPrincipal) * 100;
  const currentRate = analysis.nextRow?.rate ?? analysis.actual.rows.at(-1)?.rate ?? 0;
  const nextEmi = analysis.nextRow?.emi ?? analysis.actual.summary.baseEmi;
  const remainingEmis = Math.max(0, analysis.actual.summary.totalMonths - analysis.todayIndex + 1);
  const impactEvents = [...analysis.rateImpacts, ...analysis.partPaymentImpacts].sort((a, b) =>
    a.date.localeCompare(b.date),
  );

  return (
    <div className="content">
      <section className="hero">
        <div>
          <div className="label mb-4 text-[var(--teal)]">On track · years ahead</div>
          <h1>
            You'll be debt-free
            <br />
            <em>{formatDuration(analysis.monthsSaved)}</em> sooner.
          </h1>
          <p className="mt-5 max-w-[560px] text-base leading-7 text-white/85">
            Rate drops and prepayments shaved {analysis.monthsSaved} months off your original
            15-year tenure. You save {formatInrShort(analysis.interestSaved)} in interest along the
            way.
          </p>
        </div>
        <div className="hero-stats">
          <HeroStat
            label="Original payoff"
            value={formatMonthYear(analysis.original.summary.payoffDate)}
            detail="15 yr tenure"
          />
          <HeroStat
            label="New payoff"
            value={formatMonthYear(analysis.actual.summary.payoffDate)}
            detail={`↓ ${formatDuration(analysis.monthsSaved)}`}
          />
          <HeroStat
            label="Interest saved"
            value={formatInrShort(analysis.interestSaved)}
            detail={`vs original ${formatInrShort(analysis.original.summary.totalInterest)}`}
          />
          <HeroStat
            label="Outstanding"
            value={formatInrShort(analysis.outstanding)}
            detail={`${remainingEmis} EMIs to go`}
          />
        </div>
      </section>

      <div className="kpi-grid mt-6">
        <StatCard
          icon={<IndianRupee size={15} />}
          label="Next EMI"
          value={formatInr(nextEmi)}
          detail={analysis.nextRow ? `Due ${formatDate(analysis.nextRow.date)}` : 'Loan closed'}
        />
        <StatCard
          icon={<Percent size={15} />}
          label="Current rate"
          value={`${currentRate.toFixed(2)}%`}
          detail={`${(8.7 - currentRate).toFixed(2)}% from start`}
        />
        <StatCard
          icon={<Calendar size={15} />}
          label="Principal paid"
          value={`${progress.toFixed(1)}%`}
          progress={progress}
        />
        <StatCard
          icon={<PiggyBank size={15} />}
          label="Total prepaid"
          value={formatInrShort(analysis.actual.summary.totalPrepayment)}
          detail={`${analysis.partPaymentImpacts.length} prepayments`}
        />
      </div>

      <div className="section-grid">
        <Card
          eyebrow="Outstanding balance"
          title={`You'll be done ${formatDuration(analysis.monthsSaved)} earlier`}
          subtitle="Bold line is your actual path. Dashed line is what would have happened with no rate drops or prepayments."
        >
          <BalanceChart analysis={analysis} />
        </Card>
        <Card eyebrow="Lifetime breakdown" title="Where your money goes">
          <MoneyDonut analysis={analysis} />
        </Card>
      </div>

      <div className="section-grid">
        <Card eyebrow="Tenure impact" title="Months saved per event">
          <ImpactBarChart events={impactEvents} />
        </Card>
        <Card eyebrow="Recent activity" title="Last 6 completed months">
          <div className="grid gap-3">
            {analysis.completedRows
              .slice(-6)
              .reverse()
              .map((row) => (
                <div className="border-l-2 border-[var(--primary)] pl-4" key={row.index}>
                  <div className="flex justify-between gap-3 text-sm font-bold">
                    <span>{formatMonthYear(row.date)}</span>
                    <span>{formatInr(row.emi)}</span>
                  </div>
                  <div className="subtle mt-1 text-xs">
                    P {formatInrShort(row.principal)} · I {formatInrShort(row.interest)} · Bal{' '}
                    {formatInrShort(row.closingBalance)}
                    {row.prepayment > 0 ? ` · Prepaid ${formatInrShort(row.prepayment)}` : ''}
                  </div>
                </div>
              ))}
          </div>
        </Card>
      </div>

      <Card className="mt-6" eyebrow="Payment calendar" title="Every payment, every month">
        <PaymentHeatmap rows={analysis.actual.rows} />
      </Card>
    </div>
  );
}

function HeroStat({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="hero-stat">
      <div className="label text-white/70">{label}</div>
      <div className="mt-2 text-3xl font-extrabold">{value}</div>
      <div className="mt-1 text-sm font-semibold text-[var(--teal)]">{detail}</div>
    </div>
  );
}
