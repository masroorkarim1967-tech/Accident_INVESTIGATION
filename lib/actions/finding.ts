"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireInvestigationEditAccess } from "@/lib/auth/requireInvestigationEditAccess";
import { AuthorizationError, NotFoundError } from "@/lib/errors";
import { findingSchema } from "@/lib/validation/finding";
import { UserRole } from "@/prisma/generated/prisma/client";

const EDIT_ROLES = [UserRole.Administrator, UserRole.InvestigationManager, UserRole.Investigator];

export type FindingActionState = { error: string | null; fieldErrors?: Record<string, string> };

function mapEditAccessError(error: unknown): FindingActionState | null {
  if (error instanceof AuthorizationError) return { error: error.message };
  if (error instanceof NotFoundError) return { error: error.message };
  return null;
}

/** FR-072/FR-074 — Add/Edit Finding, with citation links. findingId omitted (or null) means "add new". */
export async function saveFindingAction(
  investigationId: number,
  findingId: number | null,
  _prevState: FindingActionState,
  formData: FormData,
): Promise<FindingActionState> {
  let user;
  try {
    ({ user } = await requireInvestigationEditAccess(investigationId, EDIT_ROLES));
  } catch (error) {
    const mapped = mapEditAccessError(error);
    if (mapped) return mapped;
    throw error;
  }

  const parsed = findingSchema.safeParse({
    findingType: formData.get("findingType") || undefined,
    description: formData.get("description") || undefined,
    hazardIds: formData.getAll("hazardIds"),
    contributingFactorIds: formData.getAll("contributingFactorIds"),
    rootCauseIds: formData.getAll("rootCauseIds"),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { error: "Please correct the highlighted fields.", fieldErrors };
  }

  const { hazardIds, contributingFactorIds, rootCauseIds } = parsed.data;

  const [ownedHazards, ownedFactors, ownedRootCauses] = await Promise.all([
    hazardIds.length ? db.hazard.count({ where: { id: { in: hazardIds }, investigationId } }) : 0,
    contributingFactorIds.length ? db.contributingFactor.count({ where: { id: { in: contributingFactorIds }, investigationId } }) : 0,
    rootCauseIds.length ? db.rootCause.count({ where: { id: { in: rootCauseIds }, investigationId } }) : 0,
  ]);
  if (
    ownedHazards !== hazardIds.length ||
    ownedFactors !== contributingFactorIds.length ||
    ownedRootCauses !== rootCauseIds.length
  ) {
    return { error: "One or more cited items do not belong to this investigation." };
  }

  const data = { findingType: parsed.data.findingType, description: parsed.data.description };

  await db.$transaction(async (tx) => {
    const finding = findingId
      ? await tx.investigationFinding.update({ where: { id: findingId }, data })
      : await tx.investigationFinding.create({
          data: {
            investigationId,
            ...data,
            createdByUserId: user.id,
            findingNumber: (await tx.investigationFinding.count({ where: { investigationId } })) + 1,
          },
        });

    await Promise.all([
      tx.findingHazardLink.deleteMany({ where: { findingId: finding.id } }),
      tx.findingContributingFactorLink.deleteMany({ where: { findingId: finding.id } }),
      tx.findingRootCauseLink.deleteMany({ where: { findingId: finding.id } }),
    ]);
    await Promise.all([
      hazardIds.length
        ? tx.findingHazardLink.createMany({ data: hazardIds.map((hazardId) => ({ findingId: finding.id, hazardId })) })
        : Promise.resolve(),
      contributingFactorIds.length
        ? tx.findingContributingFactorLink.createMany({
            data: contributingFactorIds.map((contributingFactorId) => ({ findingId: finding.id, contributingFactorId })),
          })
        : Promise.resolve(),
      rootCauseIds.length
        ? tx.findingRootCauseLink.createMany({ data: rootCauseIds.map((rootCauseId) => ({ findingId: finding.id, rootCauseId })) })
        : Promise.resolve(),
    ]);
  });

  revalidatePath(`/investigations/${investigationId}`);
  return { error: null };
}

/** FR-073 — Remove Finding, with contiguous renumbering. */
export async function removeFindingAction(investigationId: number, findingId: number): Promise<FindingActionState> {
  try {
    await requireInvestigationEditAccess(investigationId, EDIT_ROLES);
  } catch (error) {
    const mapped = mapEditAccessError(error);
    if (mapped) return mapped;
    throw error;
  }

  await db.$transaction(async (tx) => {
    await tx.investigationFinding.delete({ where: { id: findingId } });
    const remaining = await tx.investigationFinding.findMany({
      where: { investigationId },
      orderBy: { findingNumber: "asc" },
    });
    for (let i = 0; i < remaining.length; i++) {
      if (remaining[i].findingNumber !== i + 1) {
        await tx.investigationFinding.update({ where: { id: remaining[i].id }, data: { findingNumber: i + 1 } });
      }
    }
  });

  revalidatePath(`/investigations/${investigationId}`);
  return { error: null };
}
