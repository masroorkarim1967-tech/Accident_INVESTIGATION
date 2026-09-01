import Link from "next/link";
import { signOut } from "@/lib/auth";
import { LiveUtcClock } from "@/components/layout/LiveUtcClock";
import { HeaderNav } from "@/components/layout/HeaderNav";

/**
 * App Header Bar (ui-spec.md §2.1) — present on every authenticated page.
 * `relative` positioning so HeaderNav's mobile dropdown (`absolute`) anchors
 * correctly beneath the header rather than the page body.
 */
export function AppHeader({ user }: { user: { name: string; role: string } }) {
  async function logout() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  return (
    <header className="relative flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-border bg-surface px-4 py-2">
      <Link
        href="/dashboard"
        className="flex items-center gap-2 font-mono text-sm font-semibold text-foreground"
      >
        <span aria-hidden="true" className="text-teal">
          ◎
        </span>
        <span className="hidden sm:inline">Aviation Incident Investigation Assistant</span>
        <span className="sm:hidden">AIIA</span>
      </Link>

      <LiveUtcClock />

      <HeaderNav user={user} logoutAction={logout} />
    </header>
  );
}
