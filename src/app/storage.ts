import type { PartPayment, RateChange } from '../features/loan/loanEngine';

export type ThemeMode = 'light' | 'dark';
export type PaletteName = 'default' | 'carbon' | 'cocoa';

export type WhatIfScenario = {
  id: string;
  name: string;
  color: string;
  rateChanges: RateChange[];
  partPayments: PartPayment[];
};

export type UserLoanData = {
  rateChanges: RateChange[];
  partPayments: PartPayment[];
  scenarios: WhatIfScenario[];
};

export type AppearancePrefs = {
  theme: ThemeMode;
  palette: PaletteName;
};

const DATA_STORAGE_KEY = 'paydown:data:v1';
const PREFS_STORAGE_KEY = 'paydown:prefs:v1';

export const scenarioColors = ['#B8A3F0', '#E89568', '#FFE15A', '#B5C77A', '#4EA5FF'];

/**
 * Reads persisted loan events and scenarios from localStorage.
 *
 * @param fallback - Default user data to use when storage is empty or invalid.
 * @returns Stored user data or the supplied fallback.
 */
export function loadUserLoanData(fallback: UserLoanData): UserLoanData {
  return readJson(DATA_STORAGE_KEY, fallback);
}

/**
 * Persists loan events and scenarios to localStorage.
 *
 * @param data - Rate changes, part payments, and what-if scenarios to store.
 * @returns Nothing.
 */
export function saveUserLoanData(data: UserLoanData): void {
  window.localStorage.setItem(DATA_STORAGE_KEY, JSON.stringify(data));
}

/**
 * Reads persisted theme and palette preferences.
 *
 * @param fallback - Default preferences to use when storage is empty or invalid.
 * @returns Stored appearance preferences or the supplied fallback.
 */
export function loadAppearancePrefs(fallback: AppearancePrefs): AppearancePrefs {
  return readJson(PREFS_STORAGE_KEY, fallback);
}

/**
 * Persists theme and palette preferences to localStorage.
 *
 * @param prefs - Appearance preferences to store.
 * @returns Nothing.
 */
export function saveAppearancePrefs(prefs: AppearancePrefs): void {
  window.localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(prefs));
}

/**
 * Clears all persisted app data owned by this dashboard.
 *
 * @returns Nothing.
 */
export function resetStoredData(): void {
  window.localStorage.removeItem(DATA_STORAGE_KEY);
  window.localStorage.removeItem(PREFS_STORAGE_KEY);
}

/**
 * Creates a new empty what-if scenario.
 *
 * @param index - Zero-based scenario index used for name and color selection.
 * @returns Scenario with no hypothetical events.
 */
export function createEmptyScenario(index: number): WhatIfScenario {
  const color = scenarioColors[index % scenarioColors.length] ?? '#B8A3F0';

  return {
    id: window.crypto.randomUUID(),
    name: `Scenario ${String.fromCharCode(65 + index)}`,
    color,
    rateChanges: [],
    partPayments: [],
  };
}

function readJson<T>(key: string, fallback: T): T {
  const rawValue = window.localStorage.getItem(key);

  if (rawValue === null) {
    return fallback;
  }

  try {
    return JSON.parse(rawValue) as T;
  } catch {
    return fallback;
  }
}
