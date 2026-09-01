"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { submitForReviewAction } from "@/lib/actions/review";

/** FR-049, ui-spec.md §16 — submission checklist shown while Analysis; "Submit for Review" disabled (not just warned) until every item is met. */
export function SubmissionChecklist({ investigationId, unmetItems }: { investigationId: number; unmetItems: string[] }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const result = await submitForReviewAction(investigationId);
      if (result.error) setError(result.error);
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded border border-border bg-surface p-4">
      {error && <ErrorBanner message={error} />}
      {unmetItems.length === 0 ? (
        <p className="text-sm text-foreground">All submission requirements are met.</p>
      ) : (
        <>
          <p className="text-sm font-medium text-foreground">Before this investigation can be submitted for review:</p>
          <ul className="list-inside list-disc text-sm text-muted">
            {unmetItems.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </>
      )}
      <div className="flex justify-end">
        <Button type="button" onClick={handleSubmit} disabled={pending || unmetItems.length > 0}>
          {pending ? "Submitting…" : "Submit for Review"}
        </Button>
      </div>
    </div>
  );
}
