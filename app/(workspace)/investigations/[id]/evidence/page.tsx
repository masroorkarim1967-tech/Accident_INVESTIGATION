import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { db } from "@/lib/db";
import { getInvestigationDetail } from "@/lib/services/investigationQueries";
import { SectionStepper } from "@/components/investigations/SectionStepper";
import { EvidencePanel } from "@/components/evidence/EvidencePanel";

/**
 * FR-021-024 — Evidence Management. FR-071 (Link Evidence to a Finding) is
 * intentionally not wired up yet: `InvestigationFinding` doesn't exist
 * until Phase 10 (implementation-plan.md Phase 6 acceptance criteria
 * explicitly allows deferring this rather than building a premature stub).
 * EvidenceCard already shows a "Not yet linked to a finding" placeholder
 * so the eventual UI slot is visible without a dangling FK today.
 */
export default async function EvidencePage({ params }: { params: Promise<{ id: string }> }) {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login");

  const { id } = await params;
  const investigationId = Number(id);
  if (!Number.isInteger(investigationId)) notFound();

  const investigation = await getInvestigationDetail(investigationId, currentUser);
  if (!investigation) notFound();

  const [occurrence, evidence] = await Promise.all([
    db.occurrence.findUnique({ where: { investigationId }, select: { noEvidenceAvailableConfirmed: true } }),
    db.evidence.findMany({
      where: { investigationId },
      orderBy: [{ evidenceType: "asc" }, { id: "asc" }],
      include: {
        attachments: {
          select: { id: true, fileName: true, mimeType: true, fileSizeBytes: true, isSimulated: true, uploadedAt: true },
          orderBy: { uploadedAt: "asc" },
        },
      },
    }),
  ]);
  if (!occurrence) notFound();

  const isReadOnly = investigation.status === "Review" || investigation.status === "Closed";

  return (
    <div className="flex">
      <SectionStepper
        investigationId={investigation.id}
        evidenceCompleteness={evidence.length > 0 || occurrence.noEvidenceAvailableConfirmed ? "complete" : "not-started"}
      />
      <div className="flex-1 p-6">
        <p className="font-mono text-xs text-muted">
          Investigations / {investigation.referenceNumber} / Evidence
        </p>
        <h1 className="mt-2 text-xl font-semibold text-foreground">Evidence</h1>

        <div className="mt-6">
          <EvidencePanel
            investigationId={investigation.id}
            evidence={evidence}
            noEvidenceAvailableConfirmed={occurrence.noEvidenceAvailableConfirmed}
            readOnly={isReadOnly}
          />
        </div>
      </div>
    </div>
  );
}
