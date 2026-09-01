"use client";

import { useActionState, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { saveRiskBandsAction, type RiskBandActionState } from "@/lib/actions/riskBandConfiguration";
import { findCoverageViolation, findDuplicateActiveLabel, type RiskBandRow } from "@/lib/validation/riskBandConfiguration";

const INITIAL_STATE: RiskBandActionState = { error: null };

type EditableRow = {
  key: string;
  id?: number;
  minScore: string;
  maxScore: string;
  bandLabel: string;
  colorHint: string;
  displayOrder: string;
  isActive: boolean;
};

function toEditableRow(row: RiskBandRow, key: string): EditableRow {
  return {
    key,
    id: row.id,
    minScore: String(row.minScore),
    maxScore: String(row.maxScore),
    bandLabel: row.bandLabel,
    colorHint: row.colorHint ?? "",
    displayOrder: String(row.displayOrder),
    isActive: row.isActive,
  };
}

function toSubmittedRow(row: EditableRow) {
  return {
    id: row.id,
    minScore: Number(row.minScore),
    maxScore: Number(row.maxScore),
    bandLabel: row.bandLabel,
    colorHint: row.colorHint,
    displayOrder: Number(row.displayOrder),
    isActive: row.isActive,
  };
}

const COLOR_SWATCH_CLASSES: Record<string, string> = {
  green: "bg-green",
  amber: "bg-amber",
  orange: "bg-orange",
  red: "bg-red",
};

/**
 * FR-069 — Administrator-only risk-band CRUD. Rows are held in local
 * state and submitted as one JSON payload (lib/actions/riskBandConfiguration.ts's
 * `saveRiskBandsAction`) so the whole set saves atomically, matching
 * "all rows save together or none do."
 */
export function RiskBandEditor({ bands }: { bands: RiskBandRow[] }) {
  const [rows, setRows] = useState<EditableRow[]>(() => bands.map((b, i) => toEditableRow(b, `existing-${b.id ?? i}`)));
  const [nextKey, setNextKey] = useState(0);
  const [state, formAction, pending] = useActionState(saveRiskBandsAction, INITIAL_STATE);

  const submitted = useMemo(() => rows.map(toSubmittedRow), [rows]);
  const coverageIssue = useMemo(() => findCoverageViolation(submitted), [submitted]);
  const duplicateIssue = useMemo(() => findDuplicateActiveLabel(submitted), [submitted]);

  function updateRow(key: string, patch: Partial<EditableRow>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function addRow() {
    setRows((prev) => [
      ...prev,
      { key: `new-${nextKey}`, minScore: "1", maxScore: "1", bandLabel: "", colorHint: "", displayOrder: String(prev.length), isActive: true },
    ]);
    setNextKey((n) => n + 1);
  }

  function removeRow(key: string) {
    setRows((prev) => prev.filter((r) => r.key !== key));
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="bandsJson" value={JSON.stringify(submitted)} />
      {state.error && <ErrorBanner message={state.error} />}
      {!state.error && coverageIssue && <ErrorBanner message={coverageIssue} />}
      {!state.error && !coverageIssue && duplicateIssue && <ErrorBanner message={duplicateIssue} />}

      {/* Live 1-25 coverage preview strip (ui-spec.md §18). */}
      <div className="flex overflow-hidden rounded border border-border">
        {Array.from({ length: 25 }, (_, i) => i + 1).map((score) => {
          const row = submitted.find((r) => r.isActive && score >= r.minScore && score <= r.maxScore);
          const swatch = row?.colorHint ? COLOR_SWATCH_CLASSES[row.colorHint] : undefined;
          return (
            <div
              key={score}
              title={`Score ${score}${row ? ` — ${row.bandLabel}` : " — uncovered"}`}
              className={`h-6 flex-1 border-r border-background last:border-r-0 ${swatch ?? "bg-red/40"}`}
            />
          );
        })}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase text-muted">
              <th className="p-2">Min</th>
              <th className="p-2">Max</th>
              <th className="p-2">Band Label</th>
              <th className="p-2">Color</th>
              <th className="p-2">Order</th>
              <th className="p-2">Active</th>
              <th className="p-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className="border-b border-border">
                <td className="p-2">
                  <input
                    type="number"
                    min={1}
                    max={25}
                    value={row.minScore}
                    onChange={(e) => updateRow(row.key, { minScore: e.target.value })}
                    className="w-16 rounded border border-border bg-background px-2 py-1 text-foreground"
                  />
                </td>
                <td className="p-2">
                  <input
                    type="number"
                    min={1}
                    max={25}
                    value={row.maxScore}
                    onChange={(e) => updateRow(row.key, { maxScore: e.target.value })}
                    className="w-16 rounded border border-border bg-background px-2 py-1 text-foreground"
                  />
                </td>
                <td className="p-2">
                  <input
                    type="text"
                    maxLength={20}
                    value={row.bandLabel}
                    onChange={(e) => updateRow(row.key, { bandLabel: e.target.value })}
                    className="w-32 rounded border border-border bg-background px-2 py-1 text-foreground"
                  />
                </td>
                <td className="p-2">
                  <select
                    value={row.colorHint}
                    onChange={(e) => updateRow(row.key, { colorHint: e.target.value })}
                    className="rounded border border-border bg-background px-2 py-1 text-foreground"
                  >
                    <option value="">None</option>
                    <option value="green">Green</option>
                    <option value="amber">Amber</option>
                    <option value="orange">Orange</option>
                    <option value="red">Red</option>
                  </select>
                </td>
                <td className="p-2">
                  <input
                    type="number"
                    value={row.displayOrder}
                    onChange={(e) => updateRow(row.key, { displayOrder: e.target.value })}
                    className="w-16 rounded border border-border bg-background px-2 py-1 text-foreground"
                  />
                </td>
                <td className="p-2">
                  <input
                    type="checkbox"
                    checked={row.isActive}
                    onChange={(e) => updateRow(row.key, { isActive: e.target.checked })}
                  />
                </td>
                <td className="p-2">
                  <button type="button" onClick={() => removeRow(row.key)} className="text-xs text-red hover:underline">
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <Button type="button" variant="ghost" onClick={addRow}>+ Add Row</Button>
        <Button type="submit" disabled={pending || Boolean(coverageIssue) || Boolean(duplicateIssue)}>
          {pending ? "Saving…" : "Save Bands"}
        </Button>
      </div>

      <p className="text-xs text-muted">
        New band configuration takes effect immediately for future risk-score computations only —
        it does not retroactively change the stored Initial/Residual/Occurrence risk band labels on
        existing records.
      </p>
    </form>
  );
}
