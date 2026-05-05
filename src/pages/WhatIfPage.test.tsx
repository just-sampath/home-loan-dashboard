import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, test } from 'vitest';

import { loanConfig, today } from '../config/loan.config';
import { buildLoanAnalysis } from '../features/loan/loanEngine';
import { WhatIfPage } from './WhatIfPage';

const analysis = buildLoanAnalysis(loanConfig, today);

describe('what-if page', () => {
  test('shows money saved in the extra outcome hero stat', () => {
    const markup = renderToStaticMarkup(
      <WhatIfPage
        analysis={analysis}
        baseConfig={loanConfig}
        onAddScenario={() => undefined}
        onChange={() => undefined}
        scenarios={[]}
      />,
    );

    expect(markup).toContain('Extra saved');
    expect(markup).toContain('0 mo');
    expect(markup).toContain('₹0 interest saved');
  });
});
