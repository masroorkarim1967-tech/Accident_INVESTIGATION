"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { createInvestigationAction, type CreateInvestigationState } from "@/lib/actions/investigation";

const INITIAL_STATE: CreateInvestigationState = { error: null };

export function CreateInvestigationForm({ defaultReporterName }: { defaultReporterName: string }) {
  const [state, formAction, pending] = useActionState(createInvestigationAction, INITIAL_STATE);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state.error && <ErrorBanner message={state.error} />}

      <div className="flex flex-col gap-1">
        <label htmlFor="title" className="text-sm text-muted">
          Title
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          maxLength={200}
          defaultValue={state.values?.title ?? ""}
          className="rounded border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-teal"
        />
        {state.fieldErrors?.title && <p className="text-xs text-red">{state.fieldErrors.title}</p>}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="occurrenceDate" className="text-sm text-muted">
          Occurrence Date
        </label>
        <input
          id="occurrenceDate"
          name="occurrenceDate"
          type="date"
          required
          max={new Date().toISOString().slice(0, 10)}
          defaultValue={state.values?.occurrenceDate ?? ""}
          className="rounded border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-teal"
        />
        {state.fieldErrors?.occurrenceDate && (
          <p className="text-xs text-red">{state.fieldErrors.occurrenceDate}</p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="reporterName" className="text-sm text-muted">
          Reporter
        </label>
        <input
          id="reporterName"
          name="reporterName"
          type="text"
          required
          maxLength={150}
          defaultValue={state.values?.reporterName ?? defaultReporterName}
          className="rounded border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-teal"
        />
        {state.fieldErrors?.reporterName && (
          <p className="text-xs text-red">{state.fieldErrors.reporterName}</p>
        )}
      </div>

      <div className="flex justify-end gap-2">
        <Link href="/investigations">
          <Button type="button" variant="ghost">
            Cancel
          </Button>
        </Link>
        {/* EC-03: disabling on submit is the primary double-submission guard */}
        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create Investigation"}
        </Button>
      </div>
    </form>
  );
}
