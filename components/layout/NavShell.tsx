import { AppHeader } from "@/components/layout/AppHeader";
import { DisclaimerRibbon } from "@/components/layout/DisclaimerRibbon";

/**
 * Composes the App Header Bar and Disclaimer Ribbon (ui-spec.md §2.1-2.2)
 * around every authenticated page's content. The per-investigation
 * workspace shell (§2.3 — Section Stepper left rail, right rail quick
 * facts) is a separate, later addition once investigation pages exist
 * (Phase 4+), not part of this global shell.
 */
export function NavShell({
  user,
  children,
}: {
  user: { name: string; role: string };
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader user={user} />
      <DisclaimerRibbon />
      <main className="flex-1">{children}</main>
    </div>
  );
}
