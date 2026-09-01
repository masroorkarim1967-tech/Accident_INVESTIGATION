import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { getInvestigationDetail, listActiveInvestigators } from "@/lib/services/investigationQueries";
import { SectionStepper } from "@/components/investigations/SectionStepper";
import { StageBadge } from "@/components/ui/StageBadge";
import { AssignInvestigatorForm } from "@/components/investigations/AssignInvestigatorForm";
import { UserRole } from "@/prisma/generated/prisma/client";

/**
 * FR-009 (Detail shell) + FR-010 (completeness, via SectionStepper) +
 * FR-006 (assign/reassign, for ADMIN/MANAGER). Full Investigation Overview
 * content (ui-spec.md §5 — key-facts grid, History tab, Action summary) is
 * built out incrementally as the phases that populate it land; this phase
 * shows what's actually available: reference number, status, occurrence
 * date, reporter, and the assignment control.
 */
export default async function InvestigationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect("/login");
  }

  const { id } = await params;
  const investigationId = Number(id);
  if (!Number.isInteger(investigationId)) {
    notFound();
  }

  const investigation = await getInvestigationDetail(investigationId, currentUser);
  if (!investigation) {
    notFound();
  }

  const canAssign =
    currentUser.role === UserRole.Administrator || currentUser.role === UserRole.InvestigationManager;
  const investigators = canAssign ? await listActiveInvestigators() : [];

  return (
    <div className="flex">
      <SectionStepper investigationId={investigation.id} occurrenceStarted={Boolean(investigation.occurrence)} />

      <div className="flex-1 p-6">
        <p className="font-mono text-xs text-muted">
          Investigations / {investigation.referenceNumber}
        </p>
        <div className="mt-2 flex items-center gap-3">
          <h1 className="text-xl font-semibold text-foreground">{investigation.title}</h1>
          <StageBadge status={investigation.status} />
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3">
          <div className="rounded border border-border bg-surface p-4">
            <p className="text-xs uppercase text-muted">Occurrence Date</p>
            <p className="mt-1 font-mono text-sm text-foreground">
              {investigation.occurrence?.occurrenceDateUtc.toISOString().slice(0, 10) ?? "Not provided"}
            </p>
          </div>
          <div className="rounded border border-border bg-surface p-4">
            <p className="text-xs uppercase text-muted">Reporter</p>
            <p className="mt-1 text-sm text-foreground">{investigation.reporterName}</p>
          </div>
          <div className="rounded border border-border bg-surface p-4">
            <p className="text-xs uppercase text-muted">Created By</p>
            <p className="mt-1 text-sm text-foreground">{investigation.createdBy.name}</p>
          </div>
        </div>

        <div className="mt-6 rounded border border-border bg-surface p-4">
          <p className="mb-2 text-xs uppercase text-muted">Assigned Investigator</p>
          {canAssign ? (
            <AssignInvestigatorForm
              investigationId={investigation.id}
              investigators={investigators}
              currentAssigneeId={investigation.assignedInvestigator?.id ?? null}
            />
          ) : (
            <p className="text-sm text-foreground">
              {investigation.assignedInvestigator?.name ?? "Not yet assigned"}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
