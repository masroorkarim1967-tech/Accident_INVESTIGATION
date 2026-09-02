"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/requireRole";
import { AuthorizationError } from "@/lib/errors";
import { generateReferenceNumber } from "@/lib/services/referenceNumber";
import { logInvestigationHistory } from "@/lib/services/investigationHistory";
import { checkAndAdvanceStage } from "@/lib/services/stageTransition";
import { createInvestigationSchema, assignInvestigatorSchema } from "@/lib/validation/investigation";
import { HistoryEventType, InvestigationStatus, UserRole } from "@/prisma/generated/prisma/client";

export type CreateInvestigationState = {
  error: string | null;
  fieldErrors?: Record<string, string>;
  // Echoed back so the form can restore what the user typed after a
  // validation failure (FR-005: "a submission failure... preserves
  // entered values") — relying on the uncontrolled <input> DOM node
  // surviving the useActionState re-render was found not to hold during
  // testing (the form re-renders with a fresh node, clearing it), so the
  // server explicitly returns the submitted values instead.
  values?: { title: string; occurrenceDate: string; reporterName: string };
};

/** FR-005 — Create New Investigation. */
export async function createInvestigationAction(
  _prevState: CreateInvestigationState,
  formData: FormData,
): Promise<CreateInvestigationState> {
  let actingUser;
  try {
    actingUser = await requireRole([
      UserRole.Administrator,
      UserRole.InvestigationManager,
      UserRole.Investigator,
    ]);
  } catch (error) {
    // technical-architecture.md §7: Server Actions return a typed result
    // rather than throwing for an expected failure; an AppError caught
    // here is mapped to that shape, never left to surface as a generic
    // Next.js error digest.
    if (error instanceof AuthorizationError) {
      return { error: "You are not authorized to create an investigation." };
    }
    throw error;
  }

  const rawValues = {
    title: String(formData.get("title") ?? ""),
    occurrenceDate: String(formData.get("occurrenceDate") ?? ""),
    reporterName: String(formData.get("reporterName") ?? ""),
  };

  const parsed = createInvestigationSchema.safeParse(rawValues);

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0])] = issue.message;
    }
    return { error: "Please correct the highlighted fields.", fieldErrors, values: rawValues };
  }

  const { title, occurrenceDate, reporterName } = parsed.data;
  const referenceNumber = await generateReferenceNumber();

  const investigation = await db.$transaction(async (tx) => {
    const created = await tx.investigation.create({
      data: {
        referenceNumber,
        title,
        reporterName,
        createdByUserId: actingUser.id,
        occurrence: {
          create: { occurrenceDateUtc: new Date(occurrenceDate) },
        },
      },
    });

    await logInvestigationHistory(
      {
        investigationId: created.id,
        eventType: HistoryEventType.Created,
        performedByUserId: actingUser.id,
        toStatus: created.status,
      },
      tx,
    );

    return created;
  });

  // Investigation Findings/Occurrence Details (FR-012) isn't built until
  // Phase 5 — redirects to the Detail shell this phase builds instead.
  // FR-005's spec target (redirect into Occurrence Details) applies once
  // that page exists.
  redirect(`/investigations/${investigation.id}`);
}

export type AssignInvestigatorState = { error: string | null };

/** FR-006 — Assign/Reassign Investigator to Investigation. */
export async function assignInvestigatorAction(
  _prevState: AssignInvestigatorState,
  formData: FormData,
): Promise<AssignInvestigatorState> {
  let actingUser;
  try {
    actingUser = await requireRole([UserRole.Administrator, UserRole.InvestigationManager]);
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return { error: "You are not authorized to assign an investigator." };
    }
    throw error;
  }

  const parsed = assignInvestigatorSchema.safeParse({
    investigationId: formData.get("investigationId"),
    investigatorUserId: formData.get("investigatorUserId"),
  });

  if (!parsed.success) {
    return { error: "Invalid selection." };
  }

  const { investigationId, investigatorUserId } = parsed.data;

  const investigation = await db.investigation.findUnique({ where: { id: investigationId } });
  if (!investigation) {
    return { error: "Investigation not found." };
  }

  // FR-006: a Closed investigation cannot be reassigned without first
  // being reopened (FR-054). Reassignment during Review IS permitted
  // (spec-review.md SR-022's resolution) and does not itself unlock any
  // other section for editing — that remains governed by FR-011 alone.
  if (investigation.status === "Closed") {
    return { error: "This investigation is closed and must be reopened before it can be reassigned." };
  }

  const targetUser = await db.user.findUnique({ where: { id: investigatorUserId } });

  // spec-review.md SR-016: assigning new work to an inactive or
  // non-Investigator account is blocked server-side, not just filtered
  // out of the picker.
  if (!targetUser || targetUser.role !== UserRole.Investigator || !targetUser.isActive) {
    return { error: "Select an active user with the Investigator role." };
  }

  await db.$transaction(async (tx) => {
    const wasAlreadyAssigned = investigation.assignedInvestigatorUserId !== null;

    await tx.investigation.update({
      where: { id: investigationId },
      data: { assignedInvestigatorUserId: investigatorUserId },
    });

    await logInvestigationHistory(
      {
        investigationId,
        eventType: wasAlreadyAssigned
          ? HistoryEventType.InvestigatorReassigned
          : HistoryEventType.InvestigatorAssigned,
        performedByUserId: actingUser.id,
      },
      tx,
    );
  });

  // Draft -> Open gate also needs Occurrence Details complete
  // (saveOccurrenceNarrativeAction) — no-ops until both are true.
  await checkAndAdvanceStage(investigationId, actingUser.id);

  return { error: null };
}

export type DeleteDraftInvestigationState = { error: string | null };

/**
 * FR-055 — Delete Draft Investigation. Administrator-only, and only while
 * status is still Draft — past that point, reopening/closing is used
 * instead of deletion (real investigative work and audit history must
 * never be destroyed). The cascade (`onDelete: Cascade` throughout
 * prisma/schema.prisma) removes every child row, including Evidence
 * `Attachment.fileBytes` (FR-055's edge case, same pattern as FR-022).
 */
export async function deleteDraftInvestigationAction(
  investigationId: number,
  _prevState: DeleteDraftInvestigationState,
  _formData: FormData,
): Promise<DeleteDraftInvestigationState> {
  try {
    await requireRole([UserRole.Administrator]);
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return { error: "You are not authorized to delete this investigation." };
    }
    throw error;
  }

  const investigation = await db.investigation.findUnique({ where: { id: investigationId } });
  if (!investigation) {
    return { error: "Investigation not found." };
  }
  if (investigation.status !== InvestigationStatus.Draft) {
    return { error: "Only a Draft investigation can be deleted." };
  }

  await db.investigation.delete({ where: { id: investigationId } });

  redirect("/investigations");
}
