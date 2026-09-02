import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { db } from "@/lib/db";
import { getInvestigationDetail } from "@/lib/services/investigationQueries";
import { SectionStepper } from "@/components/investigations/SectionStepper";
import { ContributingFactorPanel } from "@/components/rootcause/ContributingFactorPanel";

/** FR-031/FR-032/FR-033 — Contributing Factors. */
export default async function ContributingFactorsPage({ params }: { params: Promise<{ id: string }> }) {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login");

  const { id } = await params;
  const investigationId = Number(id);
  if (!Number.isInteger(investigationId)) notFound();

  const investigation = await getInvestigationDetail(investigationId, currentUser);
  if (!investigation) notFound();

  const [factors, hazards] = await Promise.all([
    db.contributingFactor.findMany({
      where: { investigationId },
      include: { hazardLinks: { select: { hazardId: true } } },
      orderBy: [{ category: "asc" }, { id: "asc" }],
    }),
    db.hazard.findMany({ where: { investigationId }, orderBy: { id: "asc" } }),
  ]);

  const isReadOnly = investigation.status === "Review" || investigation.status === "Closed";

  return (
    <div className="flex flex-col md:flex-row">
      <SectionStepper
        investigationId={investigation.id}
        contributingFactorsCompleteness={factors.length > 0 ? "complete" : "not-started"}
      />
      <div className="flex-1 p-6">
        <p className="font-mono text-xs text-muted">
          Investigations / {investigation.referenceNumber} / Contributing Factors
        </p>
        <h1 className="mt-2 text-xl font-semibold text-foreground">Contributing Factors</h1>

        <div className="mt-6">
          <ContributingFactorPanel investigationId={investigation.id} factors={factors} hazards={hazards} readOnly={isReadOnly} />
        </div>
      </div>
    </div>
  );
}
