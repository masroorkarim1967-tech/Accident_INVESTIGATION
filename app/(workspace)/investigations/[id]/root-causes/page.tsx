import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { db } from "@/lib/db";
import { getInvestigationDetail } from "@/lib/services/investigationQueries";
import { SectionStepper } from "@/components/investigations/SectionStepper";
import { RootCausePanel } from "@/components/rootcause/RootCausePanel";

/** FR-038/FR-039 — Root-Cause Analysis. Reachable directly, or via a
 *  FiveWhysAnalysis card's "Conclude Analysis" link, which passes
 *  ?fiveWhysAnalysisId= to pre-select that analysis and pre-open the form.
 */
export default async function RootCausesPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login");

  const { id } = await params;
  const investigationId = Number(id);
  if (!Number.isInteger(investigationId)) notFound();

  const investigation = await getInvestigationDetail(investigationId, currentUser);
  if (!investigation) notFound();

  const { fiveWhysAnalysisId } = await searchParams;
  const preselectedFiveWhysAnalysisId = fiveWhysAnalysisId ? Number(fiveWhysAnalysisId) : null;

  const [rootCauses, fiveWhysAnalyses, contributingFactors, evidence, witnesses] = await Promise.all([
    db.rootCause.findMany({
      where: { investigationId },
      include: { contributingFactorLinks: { select: { contributingFactorId: true } } },
      orderBy: { id: "asc" },
    }),
    db.fiveWhysAnalysis.findMany({
      where: { investigationId },
      select: { id: true, problemStatement: true, rootCause: { select: { id: true } } },
      orderBy: { createdAt: "asc" },
    }),
    db.contributingFactor.findMany({
      where: { investigationId },
      select: { id: true, description: true },
      orderBy: { id: "asc" },
    }),
    db.evidence.findMany({
      where: { investigationId },
      select: { id: true, evidenceType: true, description: true },
      orderBy: { id: "asc" },
    }),
    db.witness.findMany({
      where: { investigationId },
      select: { id: true, name: true, statementSummary: true },
      orderBy: { id: "asc" },
    }),
  ]);

  const analysisOptions = fiveWhysAnalyses.map((a) => ({
    id: a.id,
    problemStatement: a.problemStatement,
    linkedRootCauseId: a.rootCause?.id ?? null,
  }));

  const isReadOnly = investigation.status === "Review" || investigation.status === "Closed";

  return (
    <div className="flex">
      <SectionStepper
        investigationId={investigation.id}
        rootCauseCompleteness={rootCauses.length > 0 ? "complete" : "not-started"}
      />
      <div className="flex-1 p-6">
        <p className="font-mono text-xs text-muted">
          Investigations / {investigation.referenceNumber} / Root Cause Analysis
        </p>
        <h1 className="mt-2 text-xl font-semibold text-foreground">Root Cause Analysis</h1>
        <p className="mt-1 max-w-2xl text-xs text-muted">
          Every recorded conclusion is an investigator&rsquo;s professional assessment, not an
          established fact — see the Potential Root Cause / Investigator Assessment labeling below.
        </p>

        <div className="mt-6">
          <RootCausePanel
            investigationId={investigation.id}
            rootCauses={rootCauses}
            fiveWhysAnalyses={analysisOptions}
            contributingFactors={contributingFactors}
            evidence={evidence}
            witnesses={witnesses}
            preselectedFiveWhysAnalysisId={preselectedFiveWhysAnalysisId}
            readOnly={isReadOnly}
          />
        </div>
      </div>
    </div>
  );
}
