import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { db } from "@/lib/db";
import { getInvestigationDetail } from "@/lib/services/investigationQueries";
import { isOverdue } from "@/lib/services/overdueComputation";
import { SectionStepper } from "@/components/investigations/SectionStepper";
import { ActionsPanel } from "@/components/actions/ActionsPanel";
import { ActionSummaryCard } from "@/components/actions/ActionSummaryCard";
import type { ActionCardRow } from "@/components/actions/ActionCard";
import { AdvisoryBanner } from "@/components/support/AdvisoryBanner";
import { getActionReminders } from "@/lib/services/investigationSupportEngine";

/** FR-040-048 — Corrective/Preventive Actions and Action Tracking. */
export default async function ActionsPage({ params }: { params: Promise<{ id: string }> }) {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login");

  const { id } = await params;
  const investigationId = Number(id);
  if (!Number.isInteger(investigationId)) notFound();

  const investigation = await getInvestigationDetail(investigationId, currentUser);
  if (!investigation) notFound();

  const [correctiveRows, preventiveRows, users, rootCauses, hazards] = await Promise.all([
    db.correctiveAction.findMany({
      where: { investigationId },
      include: { owner: { select: { name: true } } },
      orderBy: { id: "asc" },
    }),
    db.preventiveAction.findMany({
      where: { investigationId },
      include: { owner: { select: { name: true } } },
      orderBy: { id: "asc" },
    }),
    db.user.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.rootCause.findMany({
      where: { investigationId },
      select: { id: true, description: true, isInconclusive: true },
      orderBy: { id: "asc" },
    }),
    db.hazard.findMany({ where: { investigationId }, select: { id: true, description: true }, orderBy: { id: "asc" } }),
  ]);

  function toRow(row: (typeof correctiveRows)[number]): ActionCardRow {
    return {
      id: row.id,
      description: row.description,
      priority: row.priority,
      status: row.status,
      targetDate: row.targetDate,
      ownerUserId: row.ownerUserId,
      ownerExternalName: row.ownerExternalName,
      ownerName: row.owner?.name ?? null,
      department: row.department,
      rootCauseId: row.rootCauseId,
      hazardId: row.hazardId,
      requiredForClosure: row.requiredForClosure,
      investigatorComments: row.investigatorComments,
      overdue: isOverdue(row.targetDate, row.status),
      // Present on CorrectiveAction/PreventiveAction alike; ActionCard
      // only reads them for the "awaiting verification" / verified-summary
      // display, not for the shape above.
      effectivenessResult: row.effectivenessResult,
      verificationMethod: row.verificationMethod,
      verificationNotes: row.verificationNotes,
    };
  }

  const correctiveActions = correctiveRows.map(toRow);
  const preventiveActions = preventiveRows.map(toRow);
  const rootCauseOptions = rootCauses
    .filter((rc) => !rc.isInconclusive)
    .map((rc) => ({ id: rc.id, description: rc.description ?? "" }));

  const isReadOnly = investigation.status === "Review" || investigation.status === "Closed";
  const actionReminders = await getActionReminders(investigationId);

  return (
    <div className="flex flex-col md:flex-row">
      <SectionStepper
        investigationId={investigation.id}
        actionsCompleteness={correctiveActions.length > 0 || preventiveActions.length > 0 ? "complete" : "not-started"}
      />
      <div className="flex-1 p-6">
        <p className="font-mono text-xs text-muted">
          Investigations / {investigation.referenceNumber} / Corrective/Preventive Actions
        </p>
        <h1 className="mt-2 text-xl font-semibold text-foreground">Corrective/Preventive Actions</h1>

        <div className="mt-4">
          <ActionSummaryCard actions={[...correctiveActions, ...preventiveActions]} />
        </div>

        {actionReminders.reminders.length > 0 && (
          <div className="mt-4 max-w-2xl">
            <AdvisoryBanner label={actionReminders.label} items={actionReminders.reminders} />
          </div>
        )}

        <div className="mt-6">
          <ActionsPanel
            investigationId={investigation.id}
            currentUser={{ id: currentUser.id, role: currentUser.role }}
            correctiveActions={correctiveActions}
            preventiveActions={preventiveActions}
            users={users}
            rootCauses={rootCauseOptions}
            hazards={hazards}
            readOnly={isReadOnly}
          />
        </div>
      </div>
    </div>
  );
}
