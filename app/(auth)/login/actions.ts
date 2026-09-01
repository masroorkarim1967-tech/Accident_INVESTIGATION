"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/lib/auth";
import { AccountInactiveError, RateLimitedError } from "@/lib/auth/credentialsErrors";
import { DEMO_PASSWORD, GUEST_VIEWER_EMAIL } from "@/lib/data/demoAccounts";

export type LoginActionState = { error: string | null };

function messageForAuthError(error: AuthError): string {
  if (error instanceof AccountInactiveError) {
    return "This account is inactive — contact an Administrator.";
  }
  if (error instanceof RateLimitedError) {
    return "Too many attempts — please try again later.";
  }
  return "Incorrect email or password";
}

export async function loginAction(
  _prevState: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  const email = formData.get("email");
  const password = formData.get("password");

  if (typeof email !== "string" || typeof password !== "string" || !email || !password) {
    return { error: "Email and password are required." };
  }

  try {
    await signIn("credentials", { email, password, redirectTo: "/dashboard" });
    return { error: null };
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: messageForAuthError(error) };
    }
    // Auth.js's own successful-sign-in redirect is implemented by throwing
    // a Next.js redirect internally — anything that isn't an AuthError must
    // be re-thrown, or a successful login would never actually navigate.
    throw error;
  }
}

/**
 * "Continue as Viewer" (ui-spec.md §1) — resolves spec-review.md SR-011 by
 * transparently signing in as the seeded Guest Viewer account, through the
 * exact same authorize() path (rate-limited/logged like any other login)
 * rather than a genuinely anonymous bypass.
 */
export async function continueAsViewerAction(): Promise<LoginActionState> {
  try {
    await signIn("credentials", {
      email: GUEST_VIEWER_EMAIL,
      password: DEMO_PASSWORD,
      redirectTo: "/dashboard",
    });
    return { error: null };
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: messageForAuthError(error) };
    }
    throw error;
  }
}
