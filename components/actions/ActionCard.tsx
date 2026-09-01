"use client";

import { useState } from "react";
import type { ActionStatus, VerificationMethod, EffectivenessResult } from "@/prisma/generated/prisma/client";
import { ActionStatusBadge } from "./ActionStatusBadge";
import { ActionPriorityBadge } from "./ActionPriorityBadge";
import { ActionForm, type ActionFormRow } from "./ActionForm";
import { CompletionForm } from "./CompletionForm";
import { VerificationForm } from "./VerificationForm";
import { ReassignForm } from "./ReassignForm";
import { updateCorrectiveActionStatusAction, removeCorrectiveActionAction } from "@/lib/actions/correctiveAction";
import { updatePreventiveActionStatusAction, removePreventiveActionAction } from "@/lib/actions/preventiveAction";

export interface ActionCardRow extends ActionFormRow {
  status: ActionStatus;
  overdue: boolean;
  ownerName: string | null;
  effectivenessResult: EffectivenessResult | null;
  verificationMethod: VerificationMethod | null;
  verificationNotes: string | null;
}

const VERIFICATION_METHOD_LABELS: Record<string, string> = {
  FollowUpInspection: "Follow-up Inspection",
  DataReview: "Data Review",
  Audit: "Audit",
  Retest: "Retest",
  StakeholderInterview: "Stakeholder Interview",
  Other: "Other",
};
const EFFECTIVENESS_RESULT_LABELS: Record<string, string> = {
  Effective: "Effective",
  PartiallyEffective: "Partially Effective",
  NotEffective: "Not Effective",
  TooEarlyToAssess: "Too Early to Assess",
};

type Panel = "edit" | "complete" | "verify" | "reassign" | null;

export function ActionCard({
  kind,
  investigationId,
  action,
  currentUser,
  users,
  rootCauses,
  hazards,
  readOnly,
}: {
  kind: "corrective" | "preventive";
  investigationId: number;
  action: ActionCardRow;
  currentUser: { id: number; role: string };
  users: { id: number; name: string }[];
  rootCauses: { id: number; description: string }[];
  hazards: { id: number; description: string }[];
  readOnly: boolean;
}) {
  const [panel, setPanel] = useState<Panel>(null);
  const isOwner = currentUser.id === action.ownerUserId;
  const isInvestigatorOrAbove = ["Administrator", "InvestigationManager", "Investigator"].includes(currentUser.role);

  async function transition(toStatus: ActionStatus) {
    const fn = kind === "corrective" ? updateCorrectiveActionStatusAction : updatePreventiveActionStatusAction;
    await fn(investigationId, action.id, toStatus);
  }

  async function handleRemove() {
    const fn = kind === "corrective" ? removeCorrectiveActionAction : removePreventiveActionAction;
    await fn(investigationId, action.id);
  }

  const removeBlocked =
    currentUser.role === "Investigator" && (action.status === "Completed" || action.status === "Verified");

  return (
    <li className="flex flex-col gap-3 rounded border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm text-foreground">{action.description}</p>
          <p className="mt-1 text-xs text-muted">
            {action.ownerName ?? action.ownerExternalName ?? "No owner set"}
            {action.department ? ` · ${action.department}` : ""}
          </p>
        </div>
        {!readOnly && (
          <div className="flex flex-shrink-0 gap-2">
            <button type="button" onClick={() => setPanel(panel === "edit" ? null : "edit")} className="text-xs text-teal hover:underline">
              Edit
            </button>
            {removeBlocked ? (
              <span title="Already completed or verified — contact a Manager or Administrator." className="text-xs text-muted">
                Remove
              </span>
            ) : (
              <button type="button" onClick={handleRemove} className="text-xs text-red hover:underline">
                Remove
              </button>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <ActionPriorityBadge priority={action.priority} />
        <ActionStatusBadge status={action.status} overdue={action.overdue} />
        <span className="font-mono text-xs text-muted">Target: {new Date(action.targetDate).toISOString().slice(0, 10)}</span>
        {action.requiredForClosure && (
          <span className="rounded-full border border-amber px-2 py-0.5 font-mono text-xs text-amber">Required for Closure</span>
        )}
      </div>

      {action.investigatorComments && <p className="text-xs text-muted">{action.investigatorComments}</p>}

      {action.status === "Completed" && !action.effectivenessResult && isOwner && (
        <p className="text-xs text-muted">Awaiting independent verification.</p>
      )}
      {action.effectivenessResult && (
        <p className="text-xs text-muted">
          Verified via {VERIFICATION_METHOD_LABELS[action.verificationMethod ?? ""] ?? action.verificationMethod} —{" "}
          {EFFECTIVENESS_RESULT_LABELS[action.effectivenessResult] ?? action.effectivenessResult}
          {action.verificationNotes ? `: ${action.verificationNotes}` : ""}
        </p>
      )}

      {!readOnly && (
        <div className="flex flex-wrap gap-2">
          {(action.status === "Open" || action.status === "Assigned") && (
            <button type="button" onClick={() => transition("InProgress")} className="text-xs text-teal hover:underline">
              Start
            </button>
          )}
          {action.status === "InProgress" && (
            <button type="button" onClick={() => transition("Assigned")} className="text-xs text-teal hover:underline">
              Pause
            </button>
          )}
          {action.status === "Assigned" && (
            <button type="button" onClick={() => transition("Open")} className="text-xs text-teal hover:underline">
              Unassign
            </button>
          )}
          {action.status === "InProgress" && (
            <button type="button" onClick={() => setPanel(panel === "complete" ? null : "complete")} className="text-xs text-teal hover:underline">
              Mark Complete
            </button>
          )}
          {action.status === "Completed" && !isOwner && (
            <button type="button" onClick={() => setPanel(panel === "verify" ? null : "verify")} className="text-xs text-teal hover:underline">
              Verify Effectiveness
            </button>
          )}
          {(action.status === "Completed" || action.status === "Verified") && (
            <button type="button" onClick={() => transition("InProgress")} className="text-xs text-muted hover:text-foreground hover:underline">
              Reopen
            </button>
          )}
          {(action.status === "Open" || action.status === "Assigned" || action.status === "InProgress") && (
            <button type="button" onClick={() => transition("Cancelled")} className="text-xs text-muted hover:text-red hover:underline">
              Cancel
            </button>
          )}
          {(action.status === "Completed" || action.status === "Verified") && (
            <button type="button" onClick={() => transition("Cancelled")} className="text-xs text-muted hover:text-red hover:underline">
              Cancel
            </button>
          )}
          {isInvestigatorOrAbove && (
            <button type="button" onClick={() => setPanel(panel === "reassign" ? null : "reassign")} className="text-xs text-teal hover:underline">
              Reassign
            </button>
          )}
        </div>
      )}

      {panel === "edit" && (
        <ActionForm
          kind={kind}
          investigationId={investigationId}
          action={action}
          users={users}
          rootCauses={rootCauses}
          hazards={hazards}
          onDone={() => setPanel(null)}
        />
      )}
      {panel === "complete" && (
        <CompletionForm kind={kind} investigationId={investigationId} actionId={action.id} onDone={() => setPanel(null)} />
      )}
      {panel === "verify" && (
        <VerificationForm kind={kind} investigationId={investigationId} actionId={action.id} onDone={() => setPanel(null)} />
      )}
      {panel === "reassign" && (
        <ReassignForm
          kind={kind}
          investigationId={investigationId}
          actionId={action.id}
          users={users}
          currentOwnerUserId={action.ownerUserId}
          currentOwnerExternalName={action.ownerExternalName}
          currentDepartment={action.department}
          onDone={() => setPanel(null)}
        />
      )}
    </li>
  );
}
