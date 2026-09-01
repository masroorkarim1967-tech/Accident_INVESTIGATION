import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/requireRole";
import { AuthorizationError, NotFoundError } from "@/lib/errors";
import type { Investigation, User, UserRole } from "@/prisma/generated/prisma/client";

/**
 * Shared authorization for every data-section mutation from Phase 5
 * onward (Occurrence, Aircraft, Flight, Location, Persons, Immediate
 * Actions, and every later section). Three checks, in order, matching
 * FR-011/FR-012 etc.'s exact "ADMIN, MANAGER, INVESTIGATOR
 * (assigned/owning)" phrasing:
 *
 * 1. requireRole — the caller holds one of the allowed roles at all.
 * 2. Own/assigned — an Investigator additionally must have created or be
 *    assigned to *this* investigation (Administrator/Manager have
 *    unqualified access per product-spec.md §8.2's permission matrix).
 * 3. Read-only-by-status (FR-011) — Review/Closed investigations reject
 *    every write here, the single shared enforcement point rather than
 *    duplicated per entity action.
 */
export async function requireInvestigationEditAccess(
  investigationId: number,
  allowedRoles: UserRole[],
): Promise<{ user: User; investigation: Investigation }> {
  const user = await requireRole(allowedRoles);

  const investigation = await db.investigation.findUnique({ where: { id: investigationId } });
  if (!investigation) {
    throw new NotFoundError("Investigation not found.");
  }

  if (user.role === "Investigator") {
    const isOwnerOrAssigned =
      investigation.createdByUserId === user.id || investigation.assignedInvestigatorUserId === user.id;
    if (!isOwnerOrAssigned) {
      throw new AuthorizationError("You are not authorized to edit this investigation.");
    }
  }

  if (investigation.status === "Review" || investigation.status === "Closed") {
    throw new AuthorizationError("This investigation is read-only in its current state.");
  }

  return { user, investigation };
}
