import { db } from "@/lib/db";
import { LoginAttemptType } from "@/prisma/generated/prisma/client";

/**
 * Database-backed login rate limiting (security-spec.md §14, TA-4).
 * Threshold/window match security-spec.md §14's own stated example exactly:
 * "a configurable threshold (e.g. 5 failed attempts within 15 minutes)."
 */
const MAX_FAILED_ATTEMPTS = 5;
const WINDOW_MINUTES = 15;

/**
 * Checked before verifying a password, so a locked-out identifier never
 * pays the bcrypt cost and never has its password attempt recorded.
 */
export async function isLoginRateLimited(identifier: string): Promise<boolean> {
  const windowStart = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000);

  const recentFailures = await db.loginAttempt.count({
    where: {
      identifier,
      attemptType: LoginAttemptType.Login,
      succeeded: false,
      attemptedAt: { gte: windowStart },
    },
  });

  return recentFailures >= MAX_FAILED_ATTEMPTS;
}

export async function recordLoginAttempt(params: {
  identifier: string;
  ipAddress: string | null;
  succeeded: boolean;
  userId: number | null;
}): Promise<void> {
  await db.loginAttempt.create({
    data: {
      identifier: params.identifier,
      ipAddress: params.ipAddress,
      attemptType: LoginAttemptType.Login,
      succeeded: params.succeeded,
      userId: params.userId,
    },
  });
}
