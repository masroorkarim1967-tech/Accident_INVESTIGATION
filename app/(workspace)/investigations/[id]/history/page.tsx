import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { db } from "@/lib/db";
import { getInvestigationDetail } from "@/lib/services/investigationQueries";
import { AuditHistoryTimeline, type HistoryEntry } from "@/components/review/AuditHistoryTimeline";

/**
 * FR-062-064, ui-spec.md §5 — the full audit/history timeline. Reached as
 * a "History" tab link from Overview (ui-spec.md §5 describes it as a
 * tab; implemented here as its own route, same relationship the Section
 * Stepper's other pages have to Overview, since History is not itself a
 * stepper item).
 */
export default async function InvestigationHistoryPage({ params }: { params: Promise<{ id: string }> }) {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login");

  const { id } = await params;
  const investigationId = Number(id);
  if (!Number.isInteger(investigationId)) notFound();

  const investigation = await getInvestigationDetail(investigationId, currentUser);
  if (!investigation) notFound();

  const rows = await db.investigationHistory.findMany({
    where: { investigationId },
    include: { performedBy: { select: { name: true } }, relatedReview: { select: { reviewDecision: true, comments: true } } },
    orderBy: { occurredAt: "desc" },
  });
  const historyEntries: HistoryEntry[] = rows.map((row) => ({
    id: row.id,
    eventType: row.eventType,
    fromStatus: row.fromStatus,
    toStatus: row.toStatus,
    performedByName: row.performedBy.name,
    reasonText: row.reasonText,
    occurredAt: row.occurredAt.toISOString(),
    relatedReview: row.relatedReview,
  }));

  return (
    <div className="p-6">
      <p className="font-mono text-xs text-muted">
        Investigations / {investigation.referenceNumber} / History
      </p>
      <div className="mt-2 flex gap-2 border-b border-border">
        <Link href={`/investigations/${investigation.id}`} className="px-3 py-2 text-sm text-muted">
          Summary
        </Link>
        <span className="border-b-2 border-teal px-3 py-2 text-sm text-foreground">History</span>
      </div>

      <div className="mt-6 max-w-2xl">
        <AuditHistoryTimeline entries={historyEntries} />
      </div>
    </div>
  );
}
