import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, test } from 'vitest';

import { loanConfig, today } from '../config/loan.config';
import { buildLoanAnalysis } from '../features/loan/loanEngine';
import { BalanceChart, ImpactBarChart, PaymentHeatmap } from './Charts';

const analysis = buildLoanAnalysis(loanConfig, today);

describe('dashboard chart details', () => {
  test('renders balance chart annotations and payoff context', () => {
    const markup = renderToStaticMarkup(<BalanceChart analysis={analysis} />);

    expect(markup).toContain('NOW');
    expect(markup).toContain('Your actual balance');
    expect(markup).toContain('If nothing had changed');
    expect(markup).toContain('Savings');
    expect(markup).toContain('Rate drop');
    expect(markup).toContain('Prepayment');
    expect(markup).toContain('7 yr 6 mo earlier');
    expect(markup).toContain('Feb 2032');
    expect(markup).toContain('Aug 2039');
    expect(markup).toContain('Actual balance');
    expect(markup).toContain('If nothing changed');
    expect(markup).toContain('EMI');
    expect(markup).toContain('role="button"');
    expect(markup).toContain('tabindex="0"');
    expect(markup.match(/data-event-kind="rate"/g)).toHaveLength(4);
    expect(markup.match(/data-event-kind="prepayment"/g)).toHaveLength(6);
  });

  test('renders impact bars with rate and prepayment labels', () => {
    const events = [...analysis.rateImpacts, ...analysis.partPaymentImpacts].sort((left, right) =>
      left.date.localeCompare(right.date),
    );
    const markup = renderToStaticMarkup(<ImpactBarChart events={events} />);

    expect(markup).toContain('MONTHS SAVED');
    expect(markup).toContain('8.45%');
    expect(markup).toContain('₹2L');
    expect(markup).toContain('data-impact-kind="rate"');
    expect(markup).toContain('data-impact-kind="prepayment"');
  });

  test('renders payment heatmap legend and prepayment markers', () => {
    const markup = renderToStaticMarkup(<PaymentHeatmap rows={analysis.actual.rows} />);

    expect(markup).toContain('Principal repaid intensity');
    expect(markup).toContain('Part-payment month');
    expect(markup).toContain('★');
  });
});
