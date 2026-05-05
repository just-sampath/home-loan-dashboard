import { RotateCcw } from 'lucide-react';

import { Card } from '../components/Primitives';
import type { AppearancePrefs } from '../app/storage';
import type { LoanAnalysis } from '../features/loan/loanEngine';
import { formatDate, formatDuration, formatInr, formatInrShort } from '../utils/format';

type SettingsPageProps = {
  analysis: LoanAnalysis;
  prefs: AppearancePrefs;
  onPrefsChange: (prefs: AppearancePrefs) => void;
  onResetData: () => void;
};

/**
 * Renders loan settings, theme controls, and reset controls.
 *
 * @param props - Settings props.
 * @param props.analysis - Loan analysis containing derived values.
 * @param props.prefs - Current appearance preferences.
 * @param props.onPrefsChange - Callback for theme and palette changes.
 * @param props.onResetData - Callback that clears persisted data.
 * @returns Settings page element.
 */
export function SettingsPage({ analysis, prefs, onPrefsChange, onResetData }: SettingsPageProps) {
  return (
    <div className="content">
      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <Card
          eyebrow="Loan details"
          title="HDFC Home Loan"
          subtitle="Originating loan parameters. Events are edited on their own pages."
        >
          <Field label="Loan name" value="HDFC Home Loan" />
          <Field label="Lender" value="HDFC Bank" />
          <Field label="Principal" value={formatInr(3_000_000)} />
          <Field label="Starting rate" value="8.70%" />
          <Field label="Tenure" value={formatDuration(180)} />
          <Field label="Start date" value={formatDate('2024-09-01')} />
          <Field label="Rate type" value="Floating" />
          <Field label="Strategy on change" value="Reduce tenure (keep EMI)" />
        </Card>

        <Card eyebrow="Computed" title="Derived values">
          <div className="grid gap-4">
            <Metric label="Base EMI" value={formatInr(analysis.actual.summary.baseEmi)} />
            <Metric
              label="Final payment"
              value={formatInr(analysis.actual.rows.at(-1)?.emi ?? 0)}
            />
            <Metric
              label="Original total interest"
              value={formatInr(analysis.original.summary.totalInterest)}
            />
            <Metric
              label="Actual total interest"
              value={formatInr(analysis.actual.summary.totalInterest)}
              accent
            />
            <Metric
              label="Total outflow"
              value={formatInrShort(analysis.actual.summary.totalOutflow)}
            />
          </div>
        </Card>
      </div>

      <div className="section-grid">
        <Card eyebrow="Appearance" title="Theme and palette">
          <div className="field-row">
            <label className="label" htmlFor="theme">
              Theme
            </label>
            <select
              className="select"
              id="theme"
              value={prefs.theme}
              onChange={(event) =>
                onPrefsChange({ ...prefs, theme: event.target.value as AppearancePrefs['theme'] })
              }
            >
              <option value="dark">Dark</option>
              <option value="light">Light</option>
            </select>
          </div>
          <div className="field-row">
            <label className="label" htmlFor="palette">
              Palette
            </label>
            <select
              className="select"
              id="palette"
              value={prefs.palette}
              onChange={(event) =>
                onPrefsChange({
                  ...prefs,
                  palette: event.target.value as AppearancePrefs['palette'],
                })
              }
            >
              <option value="carbon">Carbon · Citron</option>
              <option value="default">Navy · Teal</option>
              <option value="cocoa">Cocoa · Apricot</option>
            </select>
          </div>
        </Card>

        <Card
          eyebrow="Data"
          title="Reset local state"
          subtitle="Clears rate changes, part payments, what-if scenarios, and theme preference from this browser."
        >
          <button className="btn btn-danger w-full" onClick={onResetData}>
            <RotateCcw size={16} />
            Reset Data
          </button>
        </Card>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="field-row">
      <div className="label">{label}</div>
      <input className="input" value={value} readOnly />
    </div>
  );
}

function Metric({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div>
      <div className="label">{label}</div>
      <div className={`mt-1 font-extrabold ${accent ? 'text-[var(--jade)]' : ''}`}>{value}</div>
    </div>
  );
}
