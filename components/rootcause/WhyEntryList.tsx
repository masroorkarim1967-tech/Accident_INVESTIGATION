"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { FiveWhysAnalysis, FiveWhysEntry } from "@/prisma/generated/prisma/client";
import { Button } from "@/components/ui/Button";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { SuggestionChip } from "@/components/ui/SuggestionChip";
import { SUPPORT_LABELS } from "@/lib/services/investigationSupportEngine/labels";
import {
  saveWhyEntryAction,
  removeWhyEntryAction,
  deleteFiveWhysAnalysisAction,
  generateFollowUpQuestionAction,
  type FiveWhysActionState,
} from "@/lib/actions/fiveWhys";

const INITIAL_STATE: FiveWhysActionState = { error: null };
const MAX_ENTRIES = 5;

function WhyEntryForm({
  investigationId,
  analysisId,
  entry,
  prefillQuestion,
  onDone,
}: {
  investigationId: number;
  analysisId: number;
  entry: FiveWhysEntry | null;
  prefillQuestion?: string | null;
  onDone: () => void;
}) {
  const action = saveWhyEntryAction.bind(null, investigationId, analysisId, entry?.id ?? null);
  const [state, formAction, pending] = useActionState(action, INITIAL_STATE);

  const lastSeenState = useRef(state);
  useEffect(() => {
    if (state === lastSeenState.current) return;
    lastSeenState.current = state;
    if (!state.error) onDone();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={formAction} className="flex flex-col gap-2 rounded border border-border bg-background p-3">
      {state.error && <ErrorBanner message={state.error} />}
      <div className="flex flex-col gap-1">
        <label htmlFor={`question-${analysisId}-${entry?.id ?? "new"}`} className="text-xs text-muted">Question</label>
        <input
          id={`question-${analysisId}-${entry?.id ?? "new"}`}
          name="question"
          type="text"
          required
          defaultValue={prefillQuestion ?? entry?.question ?? ""}
          className="rounded border border-border bg-surface px-3 py-2 text-sm text-foreground"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor={`answer-${analysisId}-${entry?.id ?? "new"}`} className="text-xs text-muted">Answer</label>
        <textarea
          id={`answer-${analysisId}-${entry?.id ?? "new"}`}
          name="answer"
          required
          rows={2}
          defaultValue={entry?.answer ?? ""}
          className="rounded border border-border bg-surface px-3 py-2 text-sm text-foreground"
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone}>Cancel</Button>
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save"}</Button>
      </div>
    </form>
  );
}

export function WhyEntryList({
  investigationId,
  analysis,
  entries,
  hasRootCause,
  readOnly,
}: {
  investigationId: number;
  analysis: FiveWhysAnalysis;
  entries: FiveWhysEntry[];
  hasRootCause: boolean;
  readOnly: boolean;
}) {
  const [editingId, setEditingId] = useState<number | "new" | null>(null);
  const [suggestedQuestion, setSuggestedQuestion] = useState<{ question: string; confidence: "High" | "Low" } | null>(null);
  const [suggestPending, setSuggestPending] = useState(false);
  const [suggestError, setSuggestError] = useState<string | null>(null);

  const sorted = [...entries].sort((a, b) => a.sequenceNumber - b.sequenceNumber);

  async function handleRemoveEntry(entryId: number) {
    await removeWhyEntryAction(investigationId, analysis.id, entryId);
  }

  async function handleDeleteAnalysis() {
    await deleteFiveWhysAnalysisAction(investigationId, analysis.id);
  }

  async function handleSuggest() {
    setSuggestPending(true);
    setSuggestError(null);
    const result = await generateFollowUpQuestionAction(investigationId, analysis.id);
    setSuggestPending(false);
    if (result.error) {
      setSuggestError(result.error);
    } else if (result.suggestion) {
      // FR-036 edge case: replaces the pending suggestion rather than stacking a second one.
      setSuggestedQuestion(result.suggestion);
    }
  }

  function handleAcceptSuggestion() {
    if (!suggestedQuestion) return;
    setEditingId("new");
  }

  function handleDismissSuggestion() {
    setSuggestedQuestion(null);
  }

  return (
    <li className="flex flex-col gap-3 rounded border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-foreground">{analysis.problemStatement}</p>
        {!readOnly && (
          <button type="button" onClick={handleDeleteAnalysis} className="flex-shrink-0 text-xs text-red hover:underline">
            Delete Analysis
          </button>
        )}
      </div>

      {sorted.length === 0 ? (
        <p className="text-xs text-muted">No Why entries yet.</p>
      ) : (
        <ol className="flex flex-col gap-2">
          {sorted.map((entry) => (
            <li key={entry.id} className="rounded border border-border bg-background p-3">
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-semibold uppercase text-muted">Why #{entry.sequenceNumber}</p>
                {!readOnly && (
                  <div className="flex flex-shrink-0 gap-2">
                    <button type="button" onClick={() => setEditingId(entry.id)} className="text-xs text-teal hover:underline">Edit</button>
                    <button type="button" onClick={() => handleRemoveEntry(entry.id)} className="text-xs text-red hover:underline">Remove</button>
                  </div>
                )}
              </div>
              <p className="mt-1 text-sm text-foreground">{entry.question}</p>
              <p className="mt-1 text-sm text-muted">{entry.answer}</p>
              {!readOnly && typeof editingId === "number" && editingId === entry.id && (
                <div className="mt-2">
                  <WhyEntryForm
                    investigationId={investigationId}
                    analysisId={analysis.id}
                    entry={entry}
                    onDone={() => setEditingId(null)}
                  />
                </div>
              )}
            </li>
          ))}
        </ol>
      )}

      {!readOnly && editingId === "new" && (
        <WhyEntryForm
          investigationId={investigationId}
          analysisId={analysis.id}
          entry={null}
          prefillQuestion={suggestedQuestion?.question}
          onDone={() => { setEditingId(null); setSuggestedQuestion(null); }}
        />
      )}

      {!readOnly && editingId !== "new" && suggestedQuestion && (
        <SuggestionChip
          label={SUPPORT_LABELS.followUpQuestion}
          onAccept={handleAcceptSuggestion}
          onDismiss={handleDismissSuggestion}
        >
          <p>{suggestedQuestion.question}</p>
          <p className="mt-1 text-xs text-muted">Confidence: {suggestedQuestion.confidence}</p>
        </SuggestionChip>
      )}

      {!readOnly && editingId !== "new" && !suggestedQuestion && sorted.length < MAX_ENTRIES && (
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="secondary" onClick={() => { setSuggestedQuestion(null); setEditingId("new"); }}>
            + Add Why #{sorted.length + 1}
          </Button>
          <Button type="button" variant="ghost" onClick={handleSuggest} disabled={suggestPending || sorted.length === 0}>
            {suggestPending ? "Thinking…" : "Suggest Next Question"}
          </Button>
        </div>
      )}
      {suggestError && <p className="text-xs text-muted">{suggestError}</p>}
      {!readOnly && sorted.length >= MAX_ENTRIES && (
        <p className="text-xs text-muted">
          5 Why entries reached — conclude this analysis, or start a second, more specific branch.
        </p>
      )}

      {!readOnly && (
        <div>
          {hasRootCause ? (
            <p className="text-xs text-muted">Already concluded by a Potential Root Cause.</p>
          ) : (
            <Link
              href={`/investigations/${investigationId}/root-causes?fiveWhysAnalysisId=${analysis.id}`}
              className="text-xs text-teal hover:underline"
            >
              Root cause established — conclude analysis
            </Link>
          )}
        </div>
      )}
    </li>
  );
}
