import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { db } from "@/lib/db";
import { RiskBandEditor } from "@/components/hazard/RiskBandEditor";
import { RISK_BAND_COLOR_HINTS, type RiskBandColorHint } from "@/lib/validation/riskBandConfiguration";
import { UserRole } from "@/prisma/generated/prisma/client";

function isKnownColorHint(value: string | null): value is RiskBandColorHint {
  return value !== null && (RISK_BAND_COLOR_HINTS as readonly string[]).includes(value);
}

export const metadata: Metadata = {
  title: "Risk Band Configuration — Aviation Incident Investigation Assistant",
};

/**
 * FR-069 — Configure Risk Bands (Administrator only). The full tabbed
 * Settings hub (ui-spec.md §18's My Settings/User Management/About tabs)
 * has no implementation-plan.md phase of its own yet — this route is
 * reachable directly rather than nested under a not-yet-built shell,
 * same as /dashboard and /investigations being real routes ahead of the
 * pages that will eventually link out to every workspace destination.
 */
export default async function RiskBandsSettingsPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login");
  if (currentUser.role !== UserRole.Administrator) notFound();

  const rows = await db.riskBandConfiguration.findMany({ orderBy: { displayOrder: "asc" } });
  // The DB column itself has no enum constraint (SR-015 is enforced by
  // the Zod schema on write, not a CHECK constraint) — defensively drop
  // any stored value outside the known set rather than passing a value
  // the strict RiskBandRow type (and the shared badge components) don't
  // recognize.
  const bands = rows.map((row) => ({
    ...row,
    colorHint: isKnownColorHint(row.colorHint) ? row.colorHint : undefined,
  }));

  return (
    <div className="p-6">
      <p className="font-mono text-xs text-muted">Settings / Risk Band Configuration</p>
      <h1 className="mt-2 text-xl font-semibold text-foreground">Risk Band Configuration</h1>
      <p className="mt-1 max-w-2xl text-xs text-muted">
        Configurable educational risk model — not an official regulatory risk matrix unless
        explicitly stated. Active bands must collectively cover scores 1-25 with no gaps or overlaps.
      </p>

      <div className="mt-6 max-w-3xl">
        <RiskBandEditor bands={bands} />
      </div>
    </div>
  );
}
