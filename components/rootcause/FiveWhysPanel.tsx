"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import type { FiveWhysAnalysis, FiveWhysEntry } from "@/prisma/generated/prisma/client";
import { Button } from "@/components/ui/Button";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { WhyEntryList } from "./WhyEntryList";
import { startFiveWhysAnalysisAction, type FiveWhysActionState } from "@/lib/actions/fiveWhys";

const INITIAL_STATE: FiveWhysActionState = { error: null };

export type AnalysisWithEntries = FiveWhysAnalysis & { entries: FiveWhysEntry[]; hasRootCause: boolean };

function StartAnalysisForm({ investigationId, onDone }: { investigationId: number; onDone: () => void }) {
  const action = startFiveWhysAnalysisAction.bind(null, investigationId);
  const [state, formAction, pending] = useActionState(action, INITIAL_STATE);

  const lastSeenState = useRef(state);
  useEffect(() => {
    if (state === lastSeenState.current) return;
    lastSeenState.current = state;
    if (!state.error) onDone();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded border border-border bg-surface p-4">
      {state.error && <ErrorBanner message={state.error} />}
      <div className="flex flex-col gap-1">
        <label htmlFor="problemStatement" className="text-sm text-muted">Problem Statement</label>
        <textarea
          id="problemStatement"
          name="problemStatement"
          required
          rows={2}
          className="rounded border border-border bg-background px-3 py-2 text-sm text-foreground"
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone}>Cancel</Button>
        <Button type="submit" disabled={pending}>{pending ? "Starting…" : "Start Analysis"}</Button>
      </div>
    </form>
  );
}

export function FiveWhysPanel({
  investigationId,
  analyses,
  readOnly,
}: {
  investigationId: number;
  analyses: AnalysisWithEntries[];
  readOnly: boolean;
}) {
  const [starting, setStarting] = useState(false);

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      {analyses.length === 0 ? (
        <p className="text-sm text-muted">No 5 Whys analyses started yet.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {analyses.map((analysis) => (
            <WhyEntryList
              key={analysis.id}
              investigationId={investigationId}
              analysis={analysis}
              entries={analysis.entries}
              hasRootCause={analysis.hasRootCause}
              readOnly={readOnly}
            />
          ))}
        </ul>
      )}

      {!readOnly && !starting && (
        <div>
          <Button type="button" variant="secondary" onClick={() => setStarting(true)}>+ Start Analysis</Button>
        </div>
      )}
      {!readOnly && starting && <StartAnalysisForm investigationId={investigationId} onDone={() => setStarting(false)} />}
    </div>
  );
}
