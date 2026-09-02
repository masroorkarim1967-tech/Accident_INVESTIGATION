import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { db } from "@/lib/db";
import { getInvestigationDetail } from "@/lib/services/investigationQueries";
import { SectionStepper } from "@/components/investigations/SectionStepper";
import { HazardPanel } from "@/components/hazard/HazardPanel";
import { AdvisoryBanner } from "@/components/support/AdvisoryBanner";
import { getRiskWarnings } from "@/lib/services/investigationSupportEngine";

/**
 * FR-029/FR-030/FR-068 — Hazard Analysis. FR-069's Risk Band Configuration
 * lives at /settings/risk-bands, not here; this page only reads the
 * currently-active bands (to color the shared 5x5 grid), the same
 * read-only relationship Phase 6's Evidence page has to Findings.
 */
export default async function HazardsPage({ params }: { params: Promise<{ id: string }> }) {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login");

  const { id } = await params;
  const investigationId = Number(id);
  if (!Number.isInteger(investigationId)) notFound();

  const investigation = await getInvestigationDetail(investigationId, currentUser);
  if (!investigation) notFound();

  const [hazards, bands] = await Promise.all([
    db.hazard.findMany({ where: { investigationId }, orderBy: { id: "asc" } }),
    db.riskBandConfiguration.findMany({
      where: { isActive: true },
      select: { minScore: true, maxScore: true, colorHint: true },
    }),
  ]);

  const isReadOnly = investigation.status === "Review" || investigation.status === "Closed";
  const riskWarnings = await getRiskWarnings(investigationId);

  return (
    <div className="flex flex-col md:flex-row">
      <SectionStepper
        investigationId={investigation.id}
        hazardsCompleteness={hazards.length > 0 ? "complete" : "not-started"}
      />
      <div className="flex-1 p-6">
        <p className="font-mono text-xs text-muted">
          Investigations / {investigation.referenceNumber} / Hazard Analysis
        </p>
        <h1 className="mt-2 text-xl font-semibold text-foreground">Hazard Analysis</h1>
        <p className="mt-1 max-w-2xl text-xs text-muted">
          Configurable educational risk model — not an official regulatory risk matrix unless
          explicitly stated.
        </p>

        {riskWarnings.warnings.length > 0 && (
          <div className="mt-4 max-w-2xl">
            <AdvisoryBanner label={riskWarnings.label} items={riskWarnings.warnings} caption={riskWarnings.caption} />
          </div>
        )}

        <div className="mt-6">
          <HazardPanel investigationId={investigation.id} hazards={hazards} bands={bands} readOnly={isReadOnly} />
        </div>
      </div>
    </div>
  );
}
