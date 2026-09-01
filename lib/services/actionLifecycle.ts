import { ActionStatus, UserRole } from "@/prisma/generated/prisma/client";

/**
 * data-model.md §6.9.1's status transition table, shared between
 * CorrectiveAction and PreventiveAction (the table draws no distinction
 * between the two). Covers every **manual** transition except:
 *  - (none) -> Open: action creation, gated by the same
 *    requireInvestigationEditAccess every other section uses.
 *  - Open -> Assigned: automatic (resolveStatusAfterOwnerChange below),
 *    never a user-initiated transition.
 *  - InProgress -> Completed: FR-045a's dedicated "Mark Complete" form.
 *  - Completed -> Verified: FR-045b's dedicated "Verify Effectiveness"
 *    form, with its own owner-exclusion rule.
 * Pure and Prisma-free so it's independently unit-testable against the
 * spec table directly.
 */

export interface ActionActorContext {
  role: UserRole;
  /** Is the current user this action's own ownerUserId? */
  isActionOwner: boolean;
  /** Is the current user the parent Investigation's creator or assigned investigator? */
  isInvestigationOwner: boolean;
}

export type TransitionCheck = { ok: true } | { ok: false; error: string };

const ADMIN_MANAGER: UserRole[] = [UserRole.Administrator, UserRole.InvestigationManager];

function isAdminOrManager(role: UserRole): boolean {
  return ADMIN_MANAGER.includes(role);
}

export function checkStatusTransition(from: ActionStatus, to: ActionStatus, actor: ActionActorContext): TransitionCheck {
  const adminOrManager = isAdminOrManager(actor.role);

  if ((from === "Open" && to === "InProgress") || (from === "Assigned" && to === "InProgress")) {
    return adminOrManager || actor.isActionOwner
      ? { ok: true }
      : { ok: false, error: "Only an Administrator, Manager, or this action's owner can start it." };
  }
  if (from === "Assigned" && to === "Open") {
    return adminOrManager || actor.isActionOwner
      ? { ok: true }
      : { ok: false, error: "Only an Administrator, Manager, or this action's owner can move it back to Open." };
  }
  if (from === "InProgress" && to === "Assigned") {
    return adminOrManager || actor.isActionOwner
      ? { ok: true }
      : { ok: false, error: "Only an Administrator, Manager, or this action's owner can pause it." };
  }
  if ((from === "Open" || from === "Assigned" || from === "InProgress") && to === "Cancelled") {
    return adminOrManager || actor.isInvestigationOwner
      ? { ok: true }
      : { ok: false, error: "Only an Administrator, Manager, or an Investigator assigned to this investigation can cancel this action." };
  }
  if ((from === "Completed" || from === "Verified") && to === "InProgress") {
    return adminOrManager
      ? { ok: true }
      : { ok: false, error: "Reopening a Completed or Verified action requires an Administrator or Manager." };
  }
  if ((from === "Completed" || from === "Verified") && to === "Cancelled") {
    return adminOrManager
      ? { ok: true }
      : { ok: false, error: "Cancelling a Completed or Verified action requires an Administrator or Manager." };
  }

  return { ok: false, error: `The transition from ${from} to ${to} is not valid.` };
}

/**
 * data-model.md §6.9.1: "The instant an owner is set on an Open action" —
 * covers both the main Add/Edit form setting an owner and FR-047's
 * dedicated Reassign control, so both call this rather than duplicating
 * the rule.
 */
export function resolveStatusAfterOwnerChange(currentStatus: ActionStatus, hasOwnerAfterChange: boolean): ActionStatus {
  if (currentStatus === "Open" && hasOwnerAfterChange) return "Assigned";
  return currentStatus;
}

/** FR-045a — "Mark Complete" is its own narrower rule, not part of the generic transition table above. */
export function checkCanMarkComplete(from: ActionStatus, actor: Pick<ActionActorContext, "role" | "isActionOwner">): TransitionCheck {
  if (from !== "Open" && from !== "Assigned" && from !== "InProgress") {
    return { ok: false, error: `Cannot mark an action Completed from status ${from}.` };
  }
  return isAdminOrManager(actor.role) || actor.isActionOwner
    ? { ok: true }
    : { ok: false, error: "Only an Administrator, Manager, or this action's owner can mark it Completed." };
}

/** FR-045b — verification is reserved to ADMIN/MANAGER/REVIEWER and explicitly never the action's own owner, regardless of role. */
export function checkCanVerify(
  from: ActionStatus,
  actor: Pick<ActionActorContext, "role" | "isActionOwner">,
): TransitionCheck {
  if (from !== "Completed") {
    return { ok: false, error: "This action must be Completed before it can be verified." };
  }
  if (actor.isActionOwner) {
    return { ok: false, error: "This action must be verified by someone other than its owner." };
  }
  const eligibleRole = actor.role === UserRole.Administrator || actor.role === UserRole.InvestigationManager || actor.role === UserRole.Reviewer;
  return eligibleRole
    ? { ok: true }
    : { ok: false, error: "Only an Administrator, Manager, or Reviewer can verify an action's effectiveness." };
}
