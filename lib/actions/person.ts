"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireInvestigationEditAccess } from "@/lib/auth/requireInvestigationEditAccess";
import { AuthorizationError, NotFoundError } from "@/lib/errors";
import { personSchema } from "@/lib/validation/person";
import { UserRole } from "@/prisma/generated/prisma/client";

const EDIT_ROLES = [UserRole.Administrator, UserRole.InvestigationManager, UserRole.Investigator];

export type PersonActionState = { error: string | null; fieldErrors?: Record<string, string> };

/** FR-016 — Add/Edit Person Involved. personId omitted (or 0) means "add new". */
export async function savePersonAction(
  investigationId: number,
  personId: number | null,
  _prevState: PersonActionState,
  formData: FormData,
): Promise<PersonActionState> {
  try {
    await requireInvestigationEditAccess(investigationId, EDIT_ROLES);
  } catch (error) {
    if (error instanceof AuthorizationError || error instanceof NotFoundError) return { error: error.message };
    throw error;
  }

  const parsed = personSchema.safeParse({
    name: formData.get("name"),
    roleType: formData.get("roleType"),
    licenseNumber: formData.get("licenseNumber"),
    nationality: formData.get("nationality"),
    injuryLevel: formData.get("injuryLevel"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { error: "Please correct the highlighted fields.", fieldErrors };
  }

  const { licenseNumber, nationality, notes, ...rest } = parsed.data;
  const data = { ...rest, licenseNumber: licenseNumber || null, nationality: nationality || null, notes: notes || null };

  if (personId) {
    await db.person.update({ where: { id: personId }, data });
  } else {
    // FR-016: recording a person and the "no persons involved" toggle are
    // mutually exclusive — adding a real entry clears the toggle.
    await db.$transaction([
      db.person.create({ data: { investigationId, ...data } }),
      db.occurrence.update({ where: { investigationId }, data: { noPersonsInvolvedConfirmed: false } }),
    ]);
  }

  revalidatePath(`/investigations/${investigationId}`);
  return { error: null };
}

/** FR-017 — Remove Person Involved. */
export async function removePersonAction(investigationId: number, personId: number): Promise<PersonActionState> {
  try {
    await requireInvestigationEditAccess(investigationId, EDIT_ROLES);
  } catch (error) {
    if (error instanceof AuthorizationError || error instanceof NotFoundError) return { error: error.message };
    throw error;
  }

  await db.person.delete({ where: { id: personId } });
  revalidatePath(`/investigations/${investigationId}`);
  return { error: null };
}
