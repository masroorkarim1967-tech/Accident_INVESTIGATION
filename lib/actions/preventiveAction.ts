"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireInvestigationEditAccess } from "@/lib/auth/requireInvestigationEditAccess";
import { requireRole } from "@/lib/auth/requireRole";
import { AuthorizationError, NotFoundError } from "@/lib/errors";
import {
  preventiveActionSchema,
  completeActionSchema,
  verifyActionSchema,
  reassignActionOwnerSchema,
} from "@/lib/validation/preventiveAction";
import {
  checkStatusTransition,
  checkCanMarkComplete,
  checkCanVerify,
  resolveStatusAfterOwnerChange,
} from "@/lib/services/actionLifecycle";
import { UserRole, ActionStatus } from "@/prisma/generated/prisma/client";

const EDIT_ROLES = [UserRole.Administrator, UserRole.InvestigationManager, UserRole.Investigator];
// See correctiveAction.ts's identical constant for why this is broader than EDIT_ROLES.
const ACTOR_ROLES = [UserRole.Administrator, UserRole.InvestigationManager, UserRole.Investigator, UserRole.Reviewer];

export type PreventiveActionState = { error: string | null; fieldErrors?: Record<string, string> };

function mapEditAccessError(error: unknown): PreventiveActionState | null {
  if (error instanceof AuthorizationError) return { error: error.message };
  if (error instanceof NotFoundError) return { error: error.message };
  return null;
}

/** FR-042 — Add/Edit Preventive Action. actionId omitted (or null) means "add new". */
export async function savePreventiveActionAction(
  investigationId: number,
  actionId: number | null,
  _prevState: PreventiveActionState,
  formData: FormData,
): Promise<PreventiveActionState> {
  try {
    await requireInvestigationEditAccess(investigationId, EDIT_ROLES);
  } catch (error) {
    const mapped = mapEditAccessError(error);
    if (mapped) return mapped;
    throw error;
  }

  const parsed = preventiveActionSchema.safeParse({
    description: formData.get("description") || undefined,
    priority: formData.get("priority") || undefined,
    targetDate: formData.get("targetDate") || undefined,
    ownerUserId: formData.get("ownerUserId") || undefined,
    ownerExternalName: formData.get("ownerExternalName") || undefined,
    department: formData.get("department") || undefined,
    hazardId: formData.get("hazardId") || undefined,
    rootCauseId: formData.get("rootCauseId") || undefined,
    requiredForClosure: formData.get("requiredForClosure") === "true",
    investigatorComments: formData.get("investigatorComments") || undefined,
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { error: "Please correct the highlighted fields.", fieldErrors };
  }

  if (!actionId) {
    const targetDateOnly = new Date(parsed.data.targetDate);
    const todayOnly = new Date();
    todayOnly.setHours(0, 0, 0, 0);
    targetDateOnly.setHours(0, 0, 0, 0);
    if (targetDateOnly.getTime() < todayOnly.getTime()) {
      return { error: "Target Date cannot be in the past for a new action.", fieldErrors: { targetDate: "Cannot be in the past." } };
    }
  }

  if (parsed.data.hazardId) {
    const owned = await db.hazard.count({ where: { id: parsed.data.hazardId, investigationId } });
    if (!owned) return { error: "Selected Hazard does not belong to this investigation." };
  }
  if (parsed.data.rootCauseId) {
    const owned = await db.rootCause.count({ where: { id: parsed.data.rootCauseId, investigationId } });
    if (!owned) return { error: "Selected Root Cause does not belong to this investigation." };
  }

  const hasOwner = Boolean(parsed.data.ownerUserId || parsed.data.ownerExternalName);
  const data = {
    description: parsed.data.description,
    priority: parsed.data.priority,
    targetDate: new Date(parsed.data.targetDate),
    ownerUserId: parsed.data.ownerUserId ?? null,
    ownerExternalName: parsed.data.ownerExternalName || null,
    department: parsed.data.department || null,
    hazardId: parsed.data.hazardId ?? null,
    rootCauseId: parsed.data.rootCauseId ?? null,
    requiredForClosure: parsed.data.requiredForClosure,
    investigatorComments: parsed.data.investigatorComments || null,
  };

  if (actionId) {
    const existing = await db.preventiveAction.findUniqueOrThrow({ where: { id: actionId } });
    await db.preventiveAction.update({
      where: { id: actionId },
      data: { ...data, status: resolveStatusAfterOwnerChange(existing.status, hasOwner) },
    });
  } else {
    await db.preventiveAction.create({
      data: { investigationId, ...data, status: hasOwner ? ActionStatus.Assigned : ActionStatus.Open },
    });
  }

  revalidatePath(`/investigations/${investigationId}`);
  return { error: null };
}

/** FR-043 — Remove Preventive Action. */
export async function removePreventiveActionAction(investigationId: number, actionId: number): Promise<PreventiveActionState> {
  let user;
  try {
    ({ user } = await requireInvestigationEditAccess(investigationId, EDIT_ROLES));
  } catch (error) {
    const mapped = mapEditAccessError(error);
    if (mapped) return mapped;
    throw error;
  }

  const action = await db.preventiveAction.findUnique({ where: { id: actionId } });
  if (!action || action.investigationId !== investigationId) {
    return { error: "Action not found." };
  }
  if (user.role === UserRole.Investigator && (action.status === "Completed" || action.status === "Verified")) {
    return { error: "This action has already been completed or verified — contact a Manager or Administrator to delete it." };
  }

  await db.preventiveAction.delete({ where: { id: actionId } });
  revalidatePath(`/investigations/${investigationId}`);
  return { error: null };
}

async function loadActionContext(investigationId: number, actionId: number) {
  const user = await requireRole(ACTOR_ROLES);
  const investigation = await db.investigation.findUnique({ where: { id: investigationId } });
  if (!investigation) throw new NotFoundError("Investigation not found.");
  if (investigation.status === "Review" || investigation.status === "Closed") {
    throw new AuthorizationError("This investigation is read-only in its current state.");
  }
  const action = await db.preventiveAction.findUnique({ where: { id: actionId } });
  if (!action || action.investigationId !== investigationId) {
    throw new NotFoundError("Action not found.");
  }
  const actor = {
    role: user.role,
    isActionOwner: action.ownerUserId === user.id,
    isInvestigationOwner: investigation.createdByUserId === user.id || investigation.assignedInvestigatorUserId === user.id,
  };
  return { user, investigation, action, actor };
}

/** FR-044 — Update Action Status (manual transitions only; see actionLifecycle.ts for what's excluded). */
export async function updatePreventiveActionStatusAction(
  investigationId: number,
  actionId: number,
  toStatus: ActionStatus,
): Promise<PreventiveActionState> {
  let context;
  try {
    context = await loadActionContext(investigationId, actionId);
  } catch (error) {
    const mapped = mapEditAccessError(error);
    if (mapped) return mapped;
    throw error;
  }
  const { action, actor } = context;

  const check = checkStatusTransition(action.status, toStatus, actor);
  if (!check.ok) return { error: check.error };

  const clearsCompletionRecord = toStatus === "InProgress" && (action.status === "Completed" || action.status === "Verified");
  await db.preventiveAction.update({
    where: { id: actionId },
    data: {
      status: toStatus,
      ...(clearsCompletionRecord
        ? { completedDate: null, verificationMethod: null, effectivenessResult: null, verificationNotes: null }
        : {}),
    },
  });

  revalidatePath(`/investigations/${investigationId}`);
  return { error: null };
}

/** FR-045a — Mark Action Complete. */
export async function markPreventiveActionCompleteAction(
  investigationId: number,
  actionId: number,
  _prevState: PreventiveActionState,
  formData: FormData,
): Promise<PreventiveActionState> {
  let context;
  try {
    context = await loadActionContext(investigationId, actionId);
  } catch (error) {
    const mapped = mapEditAccessError(error);
    if (mapped) return mapped;
    throw error;
  }
  const { action, actor } = context;

  const check = checkCanMarkComplete(action.status, actor);
  if (!check.ok) return { error: check.error };

  const parsed = completeActionSchema.safeParse({ completedDate: formData.get("completedDate") });
  if (!parsed.success) {
    return { error: "Please correct the highlighted fields.", fieldErrors: { completedDate: parsed.error.issues[0]?.message ?? "Invalid date." } };
  }

  await db.preventiveAction.update({
    where: { id: actionId },
    data: { status: ActionStatus.Completed, completedDate: new Date(parsed.data.completedDate) },
  });

  revalidatePath(`/investigations/${investigationId}`);
  return { error: null };
}

/** FR-045b — Verify Action Effectiveness. */
export async function verifyPreventiveActionEffectivenessAction(
  investigationId: number,
  actionId: number,
  _prevState: PreventiveActionState,
  formData: FormData,
): Promise<PreventiveActionState> {
  let context;
  try {
    context = await loadActionContext(investigationId, actionId);
  } catch (error) {
    const mapped = mapEditAccessError(error);
    if (mapped) return mapped;
    throw error;
  }
  const { action, actor } = context;

  const check = checkCanVerify(action.status, actor);
  if (!check.ok) return { error: check.error };

  const parsed = verifyActionSchema.safeParse({
    verificationMethod: formData.get("verificationMethod") || undefined,
    effectivenessResult: formData.get("effectivenessResult") || undefined,
    verificationNotes: formData.get("verificationNotes") || undefined,
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { error: "Please correct the highlighted fields.", fieldErrors };
  }

  await db.preventiveAction.update({
    where: { id: actionId },
    data: {
      status: ActionStatus.Verified,
      verificationMethod: parsed.data.verificationMethod,
      effectivenessResult: parsed.data.effectivenessResult,
      verificationNotes: parsed.data.verificationNotes || null,
    },
  });

  revalidatePath(`/investigations/${investigationId}`);
  return { error: null };
}

/** FR-047 — Reassign Action Owner. */
export async function reassignPreventiveActionOwnerAction(
  investigationId: number,
  actionId: number,
  _prevState: PreventiveActionState,
  formData: FormData,
): Promise<PreventiveActionState> {
  try {
    await requireInvestigationEditAccess(investigationId, EDIT_ROLES);
  } catch (error) {
    const mapped = mapEditAccessError(error);
    if (mapped) return mapped;
    throw error;
  }

  const parsed = reassignActionOwnerSchema.safeParse({
    ownerUserId: formData.get("ownerUserId") || undefined,
    ownerExternalName: formData.get("ownerExternalName") || undefined,
    department: formData.get("department") || undefined,
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { error: "Please correct the highlighted fields.", fieldErrors };
  }

  const existing = await db.preventiveAction.findUnique({ where: { id: actionId } });
  if (!existing || existing.investigationId !== investigationId) {
    return { error: "Action not found." };
  }

  await db.preventiveAction.update({
    where: { id: actionId },
    data: {
      ownerUserId: parsed.data.ownerUserId ?? null,
      ownerExternalName: parsed.data.ownerExternalName || null,
      department: parsed.data.department || existing.department,
      status: resolveStatusAfterOwnerChange(existing.status, true),
    },
  });

  revalidatePath(`/investigations/${investigationId}`);
  return { error: null };
}
