import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { LandingPage } from "@/components/landing/LandingPage";

export const metadata: Metadata = {
  title: "Aviation Incident Investigation Assistant",
  description:
    "Structured investigation support for aviation safety and operations teams — an educational, demonstration-only portfolio project using simulated aviation data.",
};

/**
 * Root route: an authenticated visitor is sent straight to the workspace
 * (no reason to show them the marketing page again); an unauthenticated
 * visitor sees the public landing page directly, not a forced redirect to
 * /login — the landing page's own "Sign In" link goes there instead. This
 * is the first-touch portfolio artifact, distinct from ui-spec.md §1's
 * Login/Welcome page (the sign-in form itself, still at /login).
 */
export default async function RootPage() {
  const session = await auth();
  if (session?.user) {
    redirect("/dashboard");
  }
  return <LandingPage />;
}
