import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { User } from "@/prisma/generated/prisma/client";

/**
 * Same DB-truth principle as requireRole (this file's sibling), but for
 * read-side row-level scoping and display rather than gating a mutation —
 * e.g. building the Investigation List's role-scoped visibility filter
 * (FR-007, security-spec.md §6). Using the JWT's `role` claim there instead
 * would violate the "deactivation/role change takes effect on the very
 * next request" guarantee for a demoted or deactivated user's *read*
 * access, not just their *write* access.
 *
 * Returns null rather than throwing — callers decide whether "no session"
 * means redirect, an empty state, or something else.
 */
export async function getCurrentUser(): Promise<User | null> {
  const session = await auth();
  const sessionUserId = session?.user?.id;

  if (!sessionUserId) {
    return null;
  }

  const user = await db.user.findUnique({ where: { id: Number(sessionUserId) } });

  if (!user || !user.isActive) {
    return null;
  }

  return user;
}
