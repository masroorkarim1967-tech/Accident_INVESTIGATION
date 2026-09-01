"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireInvestigationEditAccess } from "@/lib/auth/requireInvestigationEditAccess";
import { AuthorizationError, NotFoundError } from "@/lib/errors";
import { evidenceSchema } from "@/lib/validation/evidence";
import { checkAndAdvanceStage } from "@/lib/services/stageTransition";
import { UserRole } from "@/prisma/generated/prisma/client";

const EDIT_ROLES = [UserRole.Administrator, UserRole.InvestigationManager, UserRole.Investigator];

export type EvidenceActionState = { error: string | null; fieldErrors?: Record<string, string> };

function mapEditAccessError(error: unknown): EvidenceActionState | null {
  if (error instanceof AuthorizationError) return { error: error.message };
  if (error instanceof NotFoundError) return { error: error.message };
  return null;
}

/** FR-021 — Add/Edit Evidence Item. evidenceId omitted (or null) means "add new". */
export async function saveEvidenceAction(
  investigationId: number,
  evidenceId: number | null,
  _prevState: EvidenceActionState,
  formData: FormData,
): Promise<EvidenceActionState> {
  let user;
  try {
    ({ user } = await requireInvestigationEditAccess(investigationId, EDIT_ROLES));
  } catch (error) {
    const mapped = mapEditAccessError(error);
    if (mapped) return mapped;
    throw error;
  }

  const parsed = evidenceSchema.safeParse({
    evidenceType: formData.get("evidenceType"),
    description: formData.get("description"),
    source: formData.get("source"),
    collectedBy: formData.get("collectedBy"),
    dateObtained: formData.get("dateObtained"),
    relevance: formData.get("relevance"),
    reliabilityAssessment: formData.get("reliabilityAssessment"),
    reliabilityNotes: formData.get("reliabilityNotes"),
    investigatorNotes: formData.get("investigatorNotes"),
    custodyNotes: formData.get("custodyNotes"),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { error: "Please correct the highlighted fields.", fieldErrors };
  }

  const data = {
    evidenceType: parsed.data.evidenceType,
    description: parsed.data.description,
    source: parsed.data.source,
    collectedBy: parsed.data.collectedBy || null,
    dateObtained: parsed.data.dateObtained ? new Date(parsed.data.dateObtained) : null,
    relevance: parsed.data.relevance,
    reliabilityAssessment: parsed.data.reliabilityAssessment,
    reliabilityNotes: parsed.data.reliabilityNotes || null,
    investigatorNotes: parsed.data.investigatorNotes || null,
    custodyNotes: parsed.data.custodyNotes || null,
  };

  if (evidenceId) {
    await db.evidence.update({ where: { id: evidenceId }, data });
  } else {
    await db.$transaction([
      db.evidence.create({ data: { investigationId, ...data } }),
      db.occurrence.update({ where: { investigationId }, data: { noEvidenceAvailableConfirmed: false } }),
    ]);
  }

  await checkAndAdvanceStage(investigationId, user.id);

  revalidatePath(`/investigations/${investigationId}`);
  return { error: null };
}

/** FR-022 — Remove Evidence Item. Attachments cascade-delete with it (schema onDelete: Cascade). */
export async function removeEvidenceAction(investigationId: number, evidenceId: number): Promise<EvidenceActionState> {
  try {
    await requireInvestigationEditAccess(investigationId, EDIT_ROLES);
  } catch (error) {
    const mapped = mapEditAccessError(error);
    if (mapped) return mapped;
    throw error;
  }

  await db.evidence.delete({ where: { id: evidenceId } });
  revalidatePath(`/investigations/${investigationId}`);
  return { error: null };
}

/** FR-021/EC-10 — "No evidence currently available" acknowledgment, mutually exclusive with logging evidence. */
export async function toggleNoEvidenceAvailableAction(
  investigationId: number,
  confirmed: boolean,
): Promise<EvidenceActionState> {
  let user;
  try {
    ({ user } = await requireInvestigationEditAccess(investigationId, EDIT_ROLES));
  } catch (error) {
    const mapped = mapEditAccessError(error);
    if (mapped) return mapped;
    throw error;
  }

  if (confirmed) {
    const existingCount = await db.evidence.count({ where: { investigationId } });
    if (existingCount > 0) {
      return { error: "Remove all logged evidence before confirming none is available." };
    }
  }

  await db.occurrence.update({ where: { investigationId }, data: { noEvidenceAvailableConfirmed: confirmed } });
  await checkAndAdvanceStage(investigationId, user.id);
  revalidatePath(`/investigations/${investigationId}`);
  return { error: null };
}
