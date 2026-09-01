import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { db } from "@/lib/db";
import { getInvestigationDetail } from "@/lib/services/investigationQueries";
import { SectionStepper } from "@/components/investigations/SectionStepper";
import { FiveWhysPanel } from "@/components/rootcause/FiveWhysPanel";

/** FR-034/FR-035/FR-036/FR-037 — 5 Whys Analysis. */
export default async function FiveWhysPage({ params }: { params: Promise<{ id: string }> }) {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login");

  const { id } = await params;
  const investigationId = Number(id);
  if (!Number.isInteger(investigationId)) notFound();

  const investigation = await getInvestigationDetail(investigationId, currentUser);
  if (!investigation) notFound();

  const rows = await db.fiveWhysAnalysis.findMany({
    where: { investigationId },
    include: { entries: true, rootCause: { select: { id: true } } },
    orderBy: { createdAt: "asc" },
  });
  const analyses = rows.map((row) => ({ ...row, hasRootCause: row.rootCause !== null }));

  const isReadOnly = investigation.status === "Review" || investigation.status === "Closed";

  return (
    <div className="flex">
      <SectionStepper
        investigationId={investigation.id}
        fiveWhysCompleteness={analyses.length > 0 ? "complete" : "not-started"}
      />
      <div className="flex-1 p-6">
        <p className="font-mono text-xs text-muted">
          Investigations / {investigation.referenceNumber} / 5 Whys
        </p>
        <h1 className="mt-2 text-xl font-semibold text-foreground">5 Whys Analysis</h1>

        <div className="mt-6">
          <FiveWhysPanel investigationId={investigation.id} analyses={analyses} readOnly={isReadOnly} />
        </div>
      </div>
    </div>
  );
}
