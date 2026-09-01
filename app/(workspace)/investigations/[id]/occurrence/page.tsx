import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { db } from "@/lib/db";
import { getInvestigationDetail } from "@/lib/services/investigationQueries";
import { SectionStepper } from "@/components/investigations/SectionStepper";
import { OccurrenceTabs } from "@/components/occurrence/OccurrenceTabs";
import { AdvisoryBanner } from "@/components/support/AdvisoryBanner";
import { getRiskWarnings } from "@/lib/services/investigationSupportEngine";

/**
 * FR-012 (Narrative), FR-027/FR-028/FR-066/FR-067 (Classification), FR-016-018
 * (Persons), FR-025/026 (Immediate Actions) — ui-spec.md §6's four-tab layout.
 */
export default async function OccurrencePage({ params }: { params: Promise<{ id: string }> }) {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login");

  const { id } = await params;
  const investigationId = Number(id);
  if (!Number.isInteger(investigationId)) notFound();

  const investigation = await getInvestigationDetail(investigationId, currentUser);
  if (!investigation) notFound();

  const [occurrence, persons, immediateActions, subcategories] = await Promise.all([
    db.occurrence.findUnique({ where: { investigationId } }),
    db.person.findMany({ where: { investigationId }, orderBy: [{ roleType: "asc" }, { name: "asc" }] }),
    db.immediateAction.findMany({ where: { investigationId }, orderBy: { occurredAt: "asc" } }),
    db.occurrenceSubcategoryOption.findMany({ where: { isActive: true }, orderBy: [{ category: "asc" }, { displayOrder: "asc" }] }),
  ]);

  if (!occurrence) notFound();

  const isReadOnly = investigation.status === "Review" || investigation.status === "Closed";
  const riskWarnings = await getRiskWarnings(investigationId);

  return (
    <div className="flex">
      <SectionStepper
        investigationId={investigation.id}
        occurrenceCompleteness={occurrence.narrativeDescription ? "in-progress" : "not-started"}
      />
      <div className="flex-1 p-6">
        <p className="font-mono text-xs text-muted">
          Investigations / {investigation.referenceNumber} / Occurrence Details
        </p>
        <h1 className="mt-2 text-xl font-semibold text-foreground">Occurrence Details</h1>

        {riskWarnings.warnings.length > 0 && (
          <div className="mt-4 max-w-2xl">
            <AdvisoryBanner label={riskWarnings.label} items={riskWarnings.warnings} caption={riskWarnings.caption} />
          </div>
        )}

        <div className="mt-6">
          <OccurrenceTabs
            investigationId={investigation.id}
            occurrence={occurrence}
            persons={persons}
            immediateActions={immediateActions}
            subcategories={subcategories}
            readOnly={isReadOnly}
          />
        </div>
      </div>
    </div>
  );
}
