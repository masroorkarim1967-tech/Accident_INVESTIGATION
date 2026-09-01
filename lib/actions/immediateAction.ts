"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireInvestigationEditAccess } from "@/lib/auth/requireInvestigationEditAccess";
import { AuthorizationError, NotFoundError } from "@/lib/errors";
import { immediateActionSchema } from "@/lib/validation/immediateAction";
import { UserRole } from "@/prisma/generated/prisma/client";

const EDIT_ROLES = [UserRole.Administrator, UserRole.InvestigationManager, UserRole.Investigator];

export type ImmediateActionActionState = { error: string | null; fieldErrors?: Record<string, string> };

/** FR-025 — Add/Edit Immediate Action. entryId omitted (or 0) means "add new". */
export async function saveImmediateActionAction(
  investigationId: number,
  entryId: number | null,
  _prevState: ImmediateActionActionState,
  formData: FormData,
): Promise<ImmediateActionActionState> {
  try {
    await requireInvestigationEditAccess(investigationId, EDIT_ROLES);
  } catch (error) {
    if (error instanceof AuthorizationError || error instanceof NotFoundError) return { error: error.message };
    throw error;
  }

  const parsed = immediateActionSchema.safeParse({
    description: formData.get("description"),
    takenBy: formData.get("takenBy"),
    occurredAt: formData.get("occurredAt"),
    actionType: formData.get("actionType"),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { error: "Please correct the highlighted fields.", fieldErrors };
  }

  const occurrence = await db.occurrence.findUniqueOrThrow({ where: { investigationId } });
  // The <input type="datetime-local"> value has no timezone suffix, so a
  // bare `new Date(...)` parses it as the SERVER's local time (ECMAScript
  // spec: a date-time string with no offset is local, unlike a date-only
  // string, which is UTC) — silently shifting every saved timestamp by the
  // server's UTC offset and corrupting the occurrence-time comparison
  // below. Appending "Z" forces the UTC interpretation the rest of this
  // app already assumes (found during Phase 5 live browser verification:
  // reproduced on a server running in UTC+5, where every entry was
  // rejected as "before the occurrence time" no matter what was entered).
  const occurredAt = new Date(`${parsed.data.occurredAt}Z`);
  const occurrenceTimestamp = new Date(occurrence.occurrenceDateUtc);
  if (occurrence.occurrenceTimeUtc) {
    const time = new Date(occurrence.occurrenceTimeUtc);
    occurrenceTimestamp.setUTCHours(time.getUTCHours(), time.getUTCMinutes(), time.getUTCSeconds());
  }

  if (occurredAt < occurrenceTimestamp) {
    return {
      error: "Please correct the highlighted fields.",
      fieldErrors: { occurredAt: "Must be on or after the occurrence date/time." },
    };
  }

  const data = { ...parsed.data, occurredAt };

  if (entryId) {
    await db.immediateAction.update({ where: { id: entryId }, data });
  } else {
    await db.immediateAction.create({ data: { investigationId, ...data } });
  }

  revalidatePath(`/investigations/${investigationId}`);
  return { error: null };
}

/** FR-026 — Remove Immediate Action. */
export async function removeImmediateActionAction(investigationId: number, entryId: number): Promise<ImmediateActionActionState> {
  try {
    await requireInvestigationEditAccess(investigationId, EDIT_ROLES);
  } catch (error) {
    if (error instanceof AuthorizationError || error instanceof NotFoundError) return { error: error.message };
    throw error;
  }

  await db.immediateAction.delete({ where: { id: entryId } });
  revalidatePath(`/investigations/${investigationId}`);
  return { error: null };
}
