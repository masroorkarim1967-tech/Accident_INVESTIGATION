import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { AuthorizationError } from "@/lib/errors";
import type { User, UserRole } from "@/prisma/generated/prisma/client";

/**
 * The real authorization boundary (technical-architecture.md §4.4's
 * addendum, NFR-4.7) — called at the top of every Server Action and Route
 * Handler before any other logic runs. Always re-reads the database rather
 * than trusting the JWT's own (necessarily stale) copy of role/active
 * status, so a deactivated account or a role change takes effect on the
 * very next request even though sessions are JWT-based, not database-based.
 *
 * Throws AuthorizationError (never returns a falsy value) so a caller can't
 * accidentally continue past a failed check.
 */
export async function requireRole(allowedRoles: UserRole[]): Promise<User> {
  const session = await auth();
  const sessionUserId = session?.user?.id;

  if (!sessionUserId) {
    throw new AuthorizationError("Not authenticated.");
  }

  const user = await db.user.findUnique({ where: { id: Number(sessionUserId) } });

  if (!user || !user.isActive) {
    throw new AuthorizationError("Account is not active.");
  }

  if (!allowedRoles.includes(user.role)) {
    throw new AuthorizationError("Not authorized for this action.");
  }

  return user;
}
