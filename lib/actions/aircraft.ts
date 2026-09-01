"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireInvestigationEditAccess } from "@/lib/auth/requireInvestigationEditAccess";
import { AuthorizationError, NotFoundError } from "@/lib/errors";
import { aircraftSchema } from "@/lib/validation/aircraft";
import { checkAndAdvanceStage } from "@/lib/services/stageTransition";
import { UserRole } from "@/prisma/generated/prisma/client";

const EDIT_ROLES = [UserRole.Administrator, UserRole.InvestigationManager, UserRole.Investigator];

export type AircraftActionState = { error: string | null; fieldErrors?: Record<string, string> };

/** FR-013 — Record/Update Aircraft Information (1:1 with investigation, upsert). */
export async function saveAircraftAction(
  investigationId: number,
  _prevState: AircraftActionState,
  formData: FormData,
): Promise<AircraftActionState> {
  let user;
  try {
    ({ user } = await requireInvestigationEditAccess(investigationId, EDIT_ROLES));
  } catch (error) {
    if (error instanceof AuthorizationError || error instanceof NotFoundError) return { error: error.message };
    throw error;
  }

  const parsed = aircraftSchema.safeParse({
    registration: formData.get("registration"),
    manufacturer: formData.get("manufacturer"),
    model: formData.get("model"),
    serialNumber: formData.get("serialNumber"),
    yearOfManufacture: formData.get("yearOfManufacture"),
    operatorName: formData.get("operatorName"),
    engineType: formData.get("engineType"),
    engineCount: formData.get("engineCount"),
    damageLevel: formData.get("damageLevel"),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { error: "Please correct the highlighted fields.", fieldErrors };
  }

  const { serialNumber, engineType, ...rest } = parsed.data;
  const data = { ...rest, serialNumber: serialNumber || null, engineType: engineType || null };

  await db.aircraft.upsert({
    where: { investigationId },
    create: { investigationId, ...data },
    update: data,
  });

  // UnderInvestigation -> Analysis gate (investigation-workflow.md §8) needs
  // Aircraft/Flight/Location/Persons/Evidence/Witnesses together — cheap to
  // re-check after any one of them saves, since it no-ops until all are met.
  await checkAndAdvanceStage(investigationId, user.id);

  revalidatePath(`/investigations/${investigationId}`);
  return { error: null };
}
