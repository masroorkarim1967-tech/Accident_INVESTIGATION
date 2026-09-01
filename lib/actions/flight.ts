"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireInvestigationEditAccess } from "@/lib/auth/requireInvestigationEditAccess";
import { AuthorizationError, NotFoundError } from "@/lib/errors";
import { flightSchema } from "@/lib/validation/flight";
import { checkAndAdvanceStage } from "@/lib/services/stageTransition";
import { UserRole } from "@/prisma/generated/prisma/client";

const EDIT_ROLES = [UserRole.Administrator, UserRole.InvestigationManager, UserRole.Investigator];

export type FlightActionState = { error: string | null; fieldErrors?: Record<string, string> };

/** FR-014 — Record/Update Flight Information (1:1 with investigation, upsert). */
export async function saveFlightAction(
  investigationId: number,
  _prevState: FlightActionState,
  formData: FormData,
): Promise<FlightActionState> {
  let user;
  try {
    ({ user } = await requireInvestigationEditAccess(investigationId, EDIT_ROLES));
  } catch (error) {
    if (error instanceof AuthorizationError || error instanceof NotFoundError) return { error: error.message };
    throw error;
  }

  const parsed = flightSchema.safeParse({
    flightNumber: formData.get("flightNumber"),
    flightRules: formData.get("flightRules"),
    departureAerodrome: formData.get("departureAerodrome"),
    destinationAerodrome: formData.get("destinationAerodrome"),
    alternateAerodrome: formData.get("alternateAerodrome"),
    picName: formData.get("picName"),
    picLicenseNumber: formData.get("picLicenseNumber"),
    crewComplement: formData.get("crewComplement"),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { error: "Please correct the highlighted fields.", fieldErrors };
  }

  const { flightNumber, alternateAerodrome, picLicenseNumber, ...rest } = parsed.data;
  const data = {
    ...rest,
    flightNumber: flightNumber || null,
    alternateAerodrome: alternateAerodrome || null,
    picLicenseNumber: picLicenseNumber || null,
  };

  await db.flight.upsert({
    where: { investigationId },
    create: { investigationId, ...data },
    update: data,
  });

  await checkAndAdvanceStage(investigationId, user.id);

  revalidatePath(`/investigations/${investigationId}`);
  return { error: null };
}
