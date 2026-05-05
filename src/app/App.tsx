import { useEffect, useMemo, useState } from 'react';

import { loanConfig, today } from '../config/loan.config';
import { buildLoanAnalysis } from '../features/loan/loanEngine';
import type { LoanConfig, PartPayment, RateChange } from '../features/loan/loanEngine';
import { DashboardPage } from '../pages/DashboardPage';
import { PartPaymentsPage } from '../pages/PartPaymentsPage';
import { RateChangesPage } from '../pages/RateChangesPage';
import { SchedulePage } from '../pages/SchedulePage';
import { SettingsPage } from '../pages/SettingsPage';
import { WhatIfPage } from '../pages/WhatIfPage';
import {
  createEmptyScenario,
  loadAppearancePrefs,
  loadUserLoanData,
  resetStoredData,
  saveAppearancePrefs,
  saveUserLoanData,
  type AppearancePrefs,
  type UserLoanData,
  type WhatIfScenario,
} from './storage';
import { AppLayout, type PageId } from '../components/Layout';

const defaultPrefs: AppearancePrefs = {
  theme: 'dark',
  palette: 'carbon',
};

const defaultUserData: UserLoanData = {
  rateChanges: loanConfig.rateChanges,
  partPayments: loanConfig.partPayments,
  scenarios: [],
};

/**
 * Renders the loan tracker application shell and page state.
 *
 * @returns React application element.
 */
export function App() {
  const [page, setPage] = useState<PageId>('dashboard');
  const [prefs, setPrefs] = useState<AppearancePrefs>(() => loadAppearancePrefs(defaultPrefs));
  const [userData, setUserData] = useState<UserLoanData>(() => loadUserLoanData(defaultUserData));

  const activeConfig = useMemo<LoanConfig>(
    () => ({
      ...loanConfig,
      rateChanges: userData.rateChanges,
      partPayments: userData.partPayments,
    }),
    [userData.partPayments, userData.rateChanges],
  );

  const analysis = useMemo(() => buildLoanAnalysis(activeConfig, today), [activeConfig]);

  useEffect(() => {
    document.documentElement.dataset.theme = prefs.theme;
    document.documentElement.dataset.palette = prefs.palette === 'default' ? '' : prefs.palette;
    saveAppearancePrefs(prefs);
  }, [prefs]);

  useEffect(() => {
    saveUserLoanData(userData);
  }, [userData]);

  const pageElement = getPageElement({
    page,
    prefs,
    setPrefs,
    analysis,
    userData,
    setRateChanges: (rateChanges) => setUserData((data) => ({ ...data, rateChanges })),
    setPartPayments: (partPayments) => setUserData((data) => ({ ...data, partPayments })),
    setScenarios: (scenarios) => setUserData((data) => ({ ...data, scenarios })),
    addScenario: () =>
      setUserData((data) => ({
        ...data,
        scenarios: [...data.scenarios, createEmptyScenario(data.scenarios.length)],
      })),
    resetData: () => {
      resetStoredData();
      setPrefs(defaultPrefs);
      setUserData(defaultUserData);
    },
  });

  return (
    <AppLayout activePage={page} onNavigate={setPage}>
      {pageElement}
    </AppLayout>
  );
}

type PageFactoryInput = {
  page: PageId;
  prefs: AppearancePrefs;
  setPrefs: (prefs: AppearancePrefs) => void;
  analysis: ReturnType<typeof buildLoanAnalysis>;
  userData: UserLoanData;
  setRateChanges: (rateChanges: RateChange[]) => void;
  setPartPayments: (partPayments: PartPayment[]) => void;
  setScenarios: (scenarios: WhatIfScenario[]) => void;
  addScenario: () => void;
  resetData: () => void;
};

function getPageElement(input: PageFactoryInput) {
  if (input.page === 'schedule') {
    return <SchedulePage analysis={input.analysis} />;
  }

  if (input.page === 'rates') {
    return (
      <RateChangesPage
        analysis={input.analysis}
        rateChanges={input.userData.rateChanges}
        onChange={input.setRateChanges}
      />
    );
  }

  if (input.page === 'parts') {
    return (
      <PartPaymentsPage
        analysis={input.analysis}
        partPayments={input.userData.partPayments}
        onChange={input.setPartPayments}
      />
    );
  }

  if (input.page === 'whatif') {
    return (
      <WhatIfPage
        analysis={input.analysis}
        baseConfig={{
          ...loanConfig,
          rateChanges: input.userData.rateChanges,
          partPayments: input.userData.partPayments,
        }}
        scenarios={input.userData.scenarios}
        onAddScenario={input.addScenario}
        onChange={input.setScenarios}
      />
    );
  }

  if (input.page === 'settings') {
    return (
      <SettingsPage
        analysis={input.analysis}
        prefs={input.prefs}
        onPrefsChange={input.setPrefs}
        onResetData={input.resetData}
      />
    );
  }

  return <DashboardPage analysis={input.analysis} />;
}
