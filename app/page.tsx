import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

/**
 * Root route is a redirect only — ui-spec.md §1 (Login) is the actual
 * first-touch page, not a distinct home page. Replaces Phase 1's
 * placeholder now that a real destination (the workspace shell) exists.
 */
export default async function RootPage() {
  const session = await auth();
  redirect(session?.user ? "/dashboard" : "/login");
}
