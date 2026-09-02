"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { deleteDraftInvestigationAction, type DeleteDraftInvestigationState } from "@/lib/actions/investigation";

const INITIAL_STATE: DeleteDraftInvestigationState = { error: null };

/** FR-055 — Administrator-only, Draft-only delete, gated behind ConfirmDialog. */
export function DeleteDraftButton({ investigationId }: { investigationId: number }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(deleteDraftInvestigationAction.bind(null, investigationId), INITIAL_STATE);

  return (
    <>
      <Button type="button" variant="destructive" onClick={() => setOpen(true)}>
        Delete Draft
      </Button>
      {state.error && <ErrorBanner message={state.error} />}
      <ConfirmDialog
        open={open}
        title="Delete this Draft investigation?"
        message="This permanently removes the investigation and everything recorded on it. This cannot be undone."
        pending={pending}
        onCancel={() => setOpen(false)}
        onConfirm={() => {
          const formData = new FormData();
          formAction(formData);
        }}
      />
    </>
  );
}
