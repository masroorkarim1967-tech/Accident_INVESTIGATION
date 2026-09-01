"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { ActionCard, type ActionCardRow } from "./ActionCard";
import { ActionForm } from "./ActionForm";

/** ui-spec.md §15 — Corrective | Preventive sub-tabs, each an identical-shape list. */
export function ActionsPanel({
  investigationId,
  currentUser,
  correctiveActions,
  preventiveActions,
  users,
  rootCauses,
  hazards,
  readOnly,
}: {
  investigationId: number;
  currentUser: { id: number; role: string };
  correctiveActions: ActionCardRow[];
  preventiveActions: ActionCardRow[];
  users: { id: number; name: string }[];
  rootCauses: { id: number; description: string }[];
  hazards: { id: number; description: string }[];
  readOnly: boolean;
}) {
  const [tab, setTab] = useState<"corrective" | "preventive">("corrective");
  const [adding, setAdding] = useState(false);

  const actions = tab === "corrective" ? correctiveActions : preventiveActions;

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <div className="flex gap-2 border-b border-border">
        <button
          type="button"
          onClick={() => { setTab("corrective"); setAdding(false); }}
          className={`px-3 py-2 text-sm ${tab === "corrective" ? "border-b-2 border-teal text-foreground" : "text-muted"}`}
        >
          Corrective
        </button>
        <button
          type="button"
          onClick={() => { setTab("preventive"); setAdding(false); }}
          className={`px-3 py-2 text-sm ${tab === "preventive" ? "border-b-2 border-teal text-foreground" : "text-muted"}`}
        >
          Preventive
        </button>
      </div>

      {actions.length === 0 ? (
        <p className="text-sm text-muted">
          {tab === "corrective" ? "No corrective actions defined yet." : "No preventive actions defined yet."}
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {actions.map((action) => (
            <ActionCard
              key={action.id}
              kind={tab}
              investigationId={investigationId}
              action={action}
              currentUser={currentUser}
              users={users}
              rootCauses={rootCauses}
              hazards={hazards}
              readOnly={readOnly}
            />
          ))}
        </ul>
      )}

      {!readOnly && !adding && (
        <div>
          <Button type="button" variant="secondary" onClick={() => setAdding(true)}>
            + Add {tab === "corrective" ? "Corrective" : "Preventive"} Action
          </Button>
        </div>
      )}
      {!readOnly && adding && (
        <ActionForm
          kind={tab}
          investigationId={investigationId}
          action={null}
          users={users}
          rootCauses={rootCauses}
          hazards={hazards}
          onDone={() => setAdding(false)}
        />
      )}
    </div>
  );
}
