import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { db } from "@/lib/db";
import { getInvestigationDetail } from "@/lib/services/investigationQueries";
import { SectionStepper } from "@/components/investigations/SectionStepper";
import { FindingPanel } from "@/components/findings/FindingPanel";

/** FR-072/FR-073/FR-074 — Investigation Findings. */
export default async function FindingsPage({ params }: { params: Promise<{ id: string }> }) {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login");

  const { id } = await params;
  const investigationId = Number(id);
  if (!Number.isInteger(investigationId)) notFound();

  const investigation = await getInvestigationDetail(investigationId, currentUser);
  if (!investigation) notFound();

  const [findingRows, hazards, contributingFactors, rootCauses] = await Promise.all([
    db.investigationFinding.findMany({
      where: { investigationId },
      orderBy: { findingNumber: "asc" },
      include: {
        hazardLinks: { include: { hazard: { select: { description: true } } } },
        contributingFactorLinks: { include: { contributingFactor: { select: { description: true } } } },
        rootCauseLinks: { include: { rootCause: { select: { description: true } } } },
      },
    }),
    db.hazard.findMany({ where: { investigationId }, select: { id: true, description: true }, orderBy: { id: "asc" } }),
    db.contributingFactor.findMany({ where: { investigationId }, select: { id: true, description: true }, orderBy: { id: "asc" } }),
    db.rootCause.findMany({
      where: { investigationId, isInconclusive: false },
      select: { id: true, description: true },
      orderBy: { id: "asc" },
    }),
  ]);

  const findings = findingRows.map((row) => ({
    id: row.id,
    findingNumber: row.findingNumber,
    findingType: row.findingType,
    description: row.description,
    hazardIds: row.hazardLinks.map((l) => l.hazardId),
    contributingFactorIds: row.contributingFactorLinks.map((l) => l.contributingFactorId),
    rootCauseIds: row.rootCauseLinks.map((l) => l.rootCauseId),
    citedHazards: row.hazardLinks.map((l) => l.hazard.description),
    citedContributingFactors: row.contributingFactorLinks.map((l) => l.contributingFactor.description),
    citedRootCauses: row.rootCauseLinks.map((l) => l.rootCause.description ?? ""),
  }));

  const isReadOnly = investigation.status === "Review" || investigation.status === "Closed";

  return (
    <div className="flex flex-col md:flex-row">
      <SectionStepper
        investigationId={investigation.id}
        findingsCompleteness={findings.length > 0 ? "complete" : "not-started"}
      />
      <div className="flex-1 p-6">
        <p className="font-mono text-xs text-muted">
          Investigations / {investigation.referenceNumber} / Investigation Findings
        </p>
        <h1 className="mt-2 text-xl font-semibold text-foreground">Investigation Findings</h1>
        <p className="mt-1 max-w-2xl text-xs text-muted">
          Formal, numbered statements for the final report — distinct from the underlying Hazard,
          Contributing Factor, and Root Cause analysis records they may cite.
        </p>

        <div className="mt-6">
          <FindingPanel
            investigationId={investigation.id}
            findings={findings}
            hazards={hazards}
            contributingFactors={contributingFactors}
            rootCauses={rootCauses.map((rc) => ({ id: rc.id, description: rc.description ?? "" }))}
            readOnly={isReadOnly}
          />
        </div>
      </div>
    </div>
  );
}
