import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard — Aviation Incident Investigation Assistant",
};

/**
 * Placeholder for Phase 3 (Core Layout/Navigation). Proves the workspace
 * shell (header, disclaimer ribbon, nav, role badge) renders correctly for
 * an authenticated session. The real Dashboard (7 stat tiles, 6 charts,
 * filters, functional-requirements.md §1.0) is built in Phase 12.
 */
export default function DashboardPage() {
  return (
    <div className="p-6">
      <div className="rounded border border-border bg-surface p-8 text-center">
        <p className="font-mono text-xs uppercase tracking-widest text-teal">Operations Overview</p>
        <h1 className="mt-4 text-xl font-semibold text-foreground">Dashboard</h1>
        <p className="mt-2 font-mono text-sm text-muted">
          Phase 3 of 16 — workspace shell operational. Dashboard content arrives in Phase 12.
        </p>
      </div>
    </div>
  );
}
