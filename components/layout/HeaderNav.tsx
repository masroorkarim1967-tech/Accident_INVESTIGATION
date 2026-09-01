"use client";

import { useState } from "react";
import Link from "next/link";
import { RoleBadge } from "@/components/ui/RoleBadge";

/**
 * ui-spec.md §2.1's primary nav + role badge + user menu, plus §6's
 * explicit mobile requirement: "header nav collapses into a menu" below
 * 768px. Split out as a Client Component (from the otherwise-Server
 * AppHeader) only because the collapse toggle needs interactive state —
 * the logout Server Action is passed in as a prop rather than defined
 * here, so this component itself stays free of server-only imports.
 */
export function HeaderNav({
  user,
  logoutAction,
}: {
  user: { name: string; role: string };
  logoutAction: () => Promise<void>;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  const links = (
    <>
      <Link href="/dashboard" className="text-muted hover:text-teal">
        Dashboard
      </Link>
      <Link href="/investigations" className="text-muted hover:text-teal">
        Investigations
      </Link>
      <Link href="/action-tracker" className="text-muted hover:text-teal">
        Action Tracker
      </Link>
      <Link
        href="/investigations/new"
        className="rounded border border-amber px-2 py-1 text-amber hover:bg-amber/10"
      >
        + New Investigation
      </Link>
      <RoleBadge role={user.role} />
      <div className="flex items-center gap-2">
        <span className="text-foreground">{user.name}</span>
        {/* The full tabbed Settings hub (ui-spec.md §18) has no
            implementation-plan.md phase of its own yet; Risk Band
            Configuration (Phase 7, FR-069, Administrator-only) is the one
            real settings page that exists so far. */}
        <Link
          href={user.role === "Administrator" ? "/settings/risk-bands" : "/settings"}
          className="text-muted hover:text-teal"
        >
          Settings
        </Link>
        <form action={logoutAction}>
          <button type="submit" className="text-muted hover:text-red">
            Log out
          </button>
        </form>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop/tablet: fully expanded nav (ui-spec.md §6) — wraps rather
          than forcing a single overflowing line at the narrower end of the
          tablet range (768px), where all these items don't fit on one row. */}
      <nav className="hidden flex-wrap items-center justify-end gap-3 text-sm md:flex">{links}</nav>

      {/* Mobile (<768px): collapses into a menu (ui-spec.md §2.1, §6) */}
      <div className="md:hidden">
        <button
          type="button"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
          className="rounded border border-border px-2 py-1 text-foreground"
        >
          {menuOpen ? "✕" : "☰"}
        </button>
        {menuOpen && (
          <nav className="absolute right-0 top-full z-10 flex w-56 flex-col gap-3 border border-border bg-surface p-4 text-sm shadow-lg">
            {links}
          </nav>
        )}
      </div>
    </>
  );
}
