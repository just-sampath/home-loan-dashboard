import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, test } from 'vitest';

import { loanConfig, today } from '../config/loan.config';
import { buildLoanAnalysis } from '../features/loan/loanEngine';
import { RateChangesPage } from './RateChangesPage';

const analysis = buildLoanAnalysis(loanConfig, today);

describe('rate changes page', () => {
  test('shows exact EMI instead of compact rounding in the rate trajectory panel', () => {
    const markup = renderToStaticMarkup(
      <RateChangesPage
        analysis={analysis}
        onChange={() => undefined}
        rateChanges={loanConfig.rateChanges}
      />,
    );

    expect(markup).toContain('EMI unchanged');
    expect(markup).toContain('₹29,895');
    expect(markup).not.toContain('₹30K');
  });
});
