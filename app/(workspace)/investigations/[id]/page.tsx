import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { getInvestigationDetail, listActiveInvestigators } from "@/lib/services/investigationQueries";
import { SectionStepper } from "@/components/investigations/SectionStepper";
import { StageBadge } from "@/components/ui/StageBadge";
import { AssignInvestigatorForm } from "@/components/investigations/AssignInvestigatorForm";
import { DeleteDraftButton } from "@/components/investigations/DeleteDraftButton";
import { AdvisoryBanner } from "@/components/support/AdvisoryBanner";
import { CompletenessScoreGauge } from "@/components/support/CompletenessScoreGauge";
import {
  getChecklistSuggestions,
  getMissingInformationWarnings,
  getCompletenessScore,
} from "@/lib/services/investigationSupportEngine";
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

  const [checklist, missingInfo, completeness] = await Promise.all([
    getChecklistSuggestions(investigationId),
    getMissingInformationWarnings(investigationId),
    getCompletenessScore(investigationId),
  ]);

  return (
    <div className="flex flex-col md:flex-row">
      <SectionStepper
        investigationId={investigation.id}
        occurrenceCompleteness={investigation.occurrence?.narrativeDescription ? "in-progress" : "not-started"}
        aircraftFlightCompleteness={
          investigation.aircraft || investigation.flight || investigation.location ? "in-progress" : "not-started"
        }
        evidenceCompleteness={
          investigation._count.evidence > 0 || investigation.occurrence?.noEvidenceAvailableConfirmed
            ? "complete"
            : "not-started"
        }
        witnessesCompleteness={
          investigation._count.witnesses > 0 || investigation.occurrence?.noWitnessesConfirmed
            ? "complete"
            : "not-started"
        }
        hazardsCompleteness={investigation._count.hazards > 0 ? "complete" : "not-started"}
        contributingFactorsCompleteness={investigation._count.contributingFactors > 0 ? "complete" : "not-started"}
        fiveWhysCompleteness={investigation._count.fiveWhysAnalyses > 0 ? "complete" : "not-started"}
        rootCauseCompleteness={investigation._count.rootCauses > 0 ? "complete" : "not-started"}
        actionsCompleteness={
          investigation._count.correctiveActions > 0 || investigation._count.preventiveActions > 0 ? "complete" : "not-started"
        }
        findingsCompleteness={investigation._count.findings > 0 ? "complete" : "not-started"}
        reviewCompleteness={
          investigation.status === "Closed" ? "complete" : investigation.status === "Review" ? "in-progress" : "not-started"
        }
      />

      <div className="flex-1 p-6">
        <p className="font-mono text-xs text-muted">
          Investigations / {investigation.referenceNumber}
        </p>
        <div className="mt-2 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-foreground">{investigation.title}</h1>
            <StageBadge status={investigation.status} />
          </div>
          {currentUser.role === UserRole.Administrator && investigation.status === "Draft" && (
            <DeleteDraftButton investigationId={investigation.id} />
          )}
        </div>

        <div className="mt-3 flex gap-2 border-b border-border">
          <span className="border-b-2 border-teal px-3 py-2 text-sm text-foreground">Summary</span>
          <Link href={`/investigations/${investigation.id}/history`} className="px-3 py-2 text-sm text-muted hover:text-teal">
            History
          </Link>
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
          <div className="rounded border border-border bg-surface p-4">
            <p className="text-xs uppercase text-muted">Last Updated</p>
            <p className="mt-1 font-mono text-sm text-foreground">{investigation.updatedAt.toISOString().slice(0, 10)}</p>
          </div>
          <div className="rounded border border-border bg-surface p-4">
            <p className="text-xs uppercase text-muted">Closed At</p>
            <p className="mt-1 font-mono text-sm text-foreground">
              {investigation.closedAt ? investigation.closedAt.toISOString().slice(0, 10) : "—"}
            </p>
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

        <div className="mt-6 flex flex-col gap-4 md:max-w-2xl">
          <CompletenessScoreGauge result={completeness} />
          <AdvisoryBanner
            label={checklist.label}
            items={checklist.suggestions}
            emptyMessage="No further steps suggested for this stage."
          />
          <AdvisoryBanner label={missingInfo.label} items={missingInfo.warnings} />
        </div>
      </div>
    </div>
  );
}
