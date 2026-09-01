import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { db } from "@/lib/db";
import { getInvestigationDetail } from "@/lib/services/investigationQueries";
import { checkAnalysisToReviewGate } from "@/lib/services/stageTransition";
import { checkClosureGate } from "@/lib/services/closureGate";
import { SectionStepper } from "@/components/investigations/SectionStepper";
import { StageBadge } from "@/components/ui/StageBadge";
import { SubmissionChecklist } from "@/components/review/SubmissionChecklist";
import { ReviewDecisionForm } from "@/components/review/ReviewDecisionForm";
import { ReopenForm } from "@/components/review/ReopenForm";
import { AuditHistoryTimeline, type HistoryEntry } from "@/components/review/AuditHistoryTimeline";
import { UserRole } from "@/prisma/generated/prisma/client";

/** FR-049-052/FR-053a/FR-054 — Investigation Review, Closure, and decision history. */
export default async function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login");

  const { id } = await params;
  const investigationId = Number(id);
  if (!Number.isInteger(investigationId)) notFound();

  const investigation = await getInvestigationDetail(investigationId, currentUser);
  if (!investigation) notFound();

  const reviewRows = await db.investigationHistory.findMany({
    where: { investigationId, eventType: { in: ["SubmittedForReview", "ReviewApproved", "ReviewChangesRequested", "Reopened", "Closed"] } },
    include: { performedBy: { select: { name: true } }, relatedReview: { select: { reviewDecision: true, comments: true } } },
    orderBy: { occurredAt: "desc" },
  });
  const historyEntries: HistoryEntry[] = reviewRows.map((row) => ({
    id: row.id,
    eventType: row.eventType,
    fromStatus: row.fromStatus,
    toStatus: row.toStatus,
    performedByName: row.performedBy.name,
    reasonText: row.reasonText,
    occurredAt: row.occurredAt.toISOString(),
    relatedReview: row.relatedReview,
  }));

  let sectionContent: React.ReactNode;

  if (investigation.status === "Analysis") {
    const gate = await checkAnalysisToReviewGate(investigationId);
    sectionContent = <SubmissionChecklist investigationId={investigation.id} unmetItems={gate.unmetItems} />;
  } else if (investigation.status === "Review") {
    const gate = await checkClosureGate(investigationId);
    sectionContent = (
      <ReviewDecisionForm
        investigationId={investigation.id}
        blockingActions={gate.blockingActions}
        nonRequiredOpenActions={gate.nonRequiredOpenActions}
        isAdmin={currentUser.role === UserRole.Administrator}
      />
    );
  } else if (investigation.status === "Closed") {
    sectionContent = <ReopenForm investigationId={investigation.id} />;
  } else {
    sectionContent = (
      <p className="text-sm text-muted">
        This investigation is still {investigation.status} — Submit for Review becomes available once it reaches Analysis.
      </p>
    );
  }

  return (
    <div className="flex">
      <SectionStepper investigationId={investigation.id} reviewCompleteness={historyEntries.length > 0 ? "in-progress" : "not-started"} />
      <div className="flex-1 p-6">
        <p className="font-mono text-xs text-muted">
          Investigations / {investigation.referenceNumber} / Investigation Review
        </p>
        <div className="mt-2 flex items-center gap-3">
          <h1 className="text-xl font-semibold text-foreground">Investigation Review</h1>
          <StageBadge status={investigation.status} />
        </div>

        <div className="mt-6 max-w-2xl">{sectionContent}</div>

        <div className="mt-8 max-w-2xl">
          <h2 className="text-sm font-semibold text-foreground">Decision History</h2>
          <div className="mt-3">
            <AuditHistoryTimeline entries={historyEntries} />
          </div>
        </div>
      </div>
    </div>
  );
}
