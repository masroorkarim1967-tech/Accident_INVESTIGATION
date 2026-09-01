"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireInvestigationEditAccess } from "@/lib/auth/requireInvestigationEditAccess";
import { AuthorizationError, NotFoundError } from "@/lib/errors";
import { locationSchema } from "@/lib/validation/location";
import { checkAndAdvanceStage } from "@/lib/services/stageTransition";
import { UserRole } from "@/prisma/generated/prisma/client";

const EDIT_ROLES = [UserRole.Administrator, UserRole.InvestigationManager, UserRole.Investigator];

export type LocationActionState = { error: string | null; fieldErrors?: Record<string, string> };

/** FR-015 — Record/Update Location & Operational Conditions (1:1 with investigation, upsert). */
export async function saveLocationAction(
  investigationId: number,
  _prevState: LocationActionState,
  formData: FormData,
): Promise<LocationActionState> {
  let user;
  try {
    ({ user } = await requireInvestigationEditAccess(investigationId, EDIT_ROLES));
  } catch (error) {
    if (error instanceof AuthorizationError || error instanceof NotFoundError) return { error: error.message };
    throw error;
  }

  const parsed = locationSchema.safeParse({
    locationDescription: formData.get("locationDescription"),
    latitude: formData.get("latitude"),
    longitude: formData.get("longitude"),
    aerodromeCode: formData.get("aerodromeCode"),
    weatherVisibility: formData.get("weatherVisibility"),
    windSpeedKt: formData.get("windSpeedKt"),
    windDirectionDeg: formData.get("windDirectionDeg"),
    cloudCover: formData.get("cloudCover"),
    temperatureC: formData.get("temperatureC"),
    precipitation: formData.get("precipitation"),
    runwayInUse: formData.get("runwayInUse"),
    lightingConditions: formData.get("lightingConditions"),
    terrainType: formData.get("terrainType"),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { error: "Please correct the highlighted fields.", fieldErrors };
  }

  const data = {
    locationDescription: parsed.data.locationDescription,
    latitude: parsed.data.latitude ?? null,
    longitude: parsed.data.longitude ?? null,
    aerodromeCode: parsed.data.aerodromeCode || null,
    weatherVisibility: parsed.data.weatherVisibility || null,
    windSpeedKt: parsed.data.windSpeedKt ?? null,
    windDirectionDeg: parsed.data.windDirectionDeg ?? null,
    cloudCover: parsed.data.cloudCover || null,
    temperatureC: parsed.data.temperatureC ?? null,
    precipitation: parsed.data.precipitation || null,
    runwayInUse: parsed.data.runwayInUse || null,
    lightingConditions: parsed.data.lightingConditions,
    terrainType: parsed.data.terrainType || null,
  };

  await db.location.upsert({
    where: { investigationId },
    create: { investigationId, ...data },
    update: data,
  });

  await checkAndAdvanceStage(investigationId, user.id);

  revalidatePath(`/investigations/${investigationId}`);
  return { error: null };
}
