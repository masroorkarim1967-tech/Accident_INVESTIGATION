"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireInvestigationEditAccess } from "@/lib/auth/requireInvestigationEditAccess";
import { AuthorizationError, NotFoundError } from "@/lib/errors";
import { witnessSchema } from "@/lib/validation/witness";
import { UserRole } from "@/prisma/generated/prisma/client";

const EDIT_ROLES = [UserRole.Administrator, UserRole.InvestigationManager, UserRole.Investigator];

export type WitnessActionState = { error: string | null; fieldErrors?: Record<string, string> };

function mapEditAccessError(error: unknown): WitnessActionState | null {
  if (error instanceof AuthorizationError) return { error: error.message };
  if (error instanceof NotFoundError) return { error: error.message };
  return null;
}

/** FR-019 — Add/Edit Witness. witnessId omitted (or null) means "add new". */
export async function saveWitnessAction(
  investigationId: number,
  witnessId: number | null,
  _prevState: WitnessActionState,
  formData: FormData,
): Promise<WitnessActionState> {
  try {
    await requireInvestigationEditAccess(investigationId, EDIT_ROLES);
  } catch (error) {
    const mapped = mapEditAccessError(error);
    if (mapped) return mapped;
    throw error;
  }

  const parsed = witnessSchema.safeParse({
    name: formData.get("name"),
    contactInfo: formData.get("contactInfo"),
    witnessType: formData.get("witnessType"),
    statementSummary: formData.get("statementSummary"),
    statementDate: formData.get("statementDate"),
    reliabilityAssessment: formData.get("reliabilityAssessment"),
    reliabilityNotes: formData.get("reliabilityNotes"),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { error: "Please correct the highlighted fields.", fieldErrors };
  }

  const data = {
    name: parsed.data.name,
    contactInfo: parsed.data.contactInfo || null,
    witnessType: parsed.data.witnessType,
    statementSummary: parsed.data.statementSummary,
    statementDate: parsed.data.statementDate ? new Date(parsed.data.statementDate) : null,
    reliabilityAssessment: parsed.data.reliabilityAssessment,
    reliabilityNotes: parsed.data.reliabilityNotes || null,
  };

  if (witnessId) {
    await db.witness.update({ where: { id: witnessId }, data });
  } else {
    await db.$transaction([
      db.witness.create({ data: { investigationId, ...data } }),
      db.occurrence.update({ where: { investigationId }, data: { noWitnessesConfirmed: false } }),
    ]);
  }

  revalidatePath(`/investigations/${investigationId}`);
  return { error: null };
}

/** FR-020 — Remove Witness. */
export async function removeWitnessAction(investigationId: number, witnessId: number): Promise<WitnessActionState> {
  try {
    await requireInvestigationEditAccess(investigationId, EDIT_ROLES);
  } catch (error) {
    const mapped = mapEditAccessError(error);
    if (mapped) return mapped;
    throw error;
  }

  await db.witness.delete({ where: { id: witnessId } });
  revalidatePath(`/investigations/${investigationId}`);
  return { error: null };
}

/** FR-019/EC-09 — "No witnesses recorded" acknowledgment, mutually exclusive with recording witnesses. */
export async function toggleNoWitnessesAction(investigationId: number, confirmed: boolean): Promise<WitnessActionState> {
  try {
    await requireInvestigationEditAccess(investigationId, EDIT_ROLES);
  } catch (error) {
    const mapped = mapEditAccessError(error);
    if (mapped) return mapped;
    throw error;
  }

  if (confirmed) {
    const existingCount = await db.witness.count({ where: { investigationId } });
    if (existingCount > 0) {
      return { error: "Remove all recorded witnesses before confirming none exist." };
    }
  }

  await db.occurrence.update({ where: { investigationId }, data: { noWitnessesConfirmed: confirmed } });
  revalidatePath(`/investigations/${investigationId}`);
  return { error: null };
}
