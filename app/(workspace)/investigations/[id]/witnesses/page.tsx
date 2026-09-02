import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { db } from "@/lib/db";
import { getInvestigationDetail } from "@/lib/services/investigationQueries";
import { SectionStepper } from "@/components/investigations/SectionStepper";
import { WitnessPanel } from "@/components/witness/WitnessPanel";

/** FR-019/FR-020 — Witness Management. */
export default async function WitnessesPage({ params }: { params: Promise<{ id: string }> }) {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login");

  const { id } = await params;
  const investigationId = Number(id);
  if (!Number.isInteger(investigationId)) notFound();

  const investigation = await getInvestigationDetail(investigationId, currentUser);
  if (!investigation) notFound();

  const [occurrence, witnesses] = await Promise.all([
    db.occurrence.findUnique({ where: { investigationId }, select: { noWitnessesConfirmed: true } }),
    db.witness.findMany({ where: { investigationId } }),
  ]);
  if (!occurrence) notFound();

  const isReadOnly = investigation.status === "Review" || investigation.status === "Closed";

  return (
    <div className="flex flex-col md:flex-row">
      <SectionStepper
        investigationId={investigation.id}
        witnessesCompleteness={witnesses.length > 0 || occurrence.noWitnessesConfirmed ? "complete" : "not-started"}
      />
      <div className="flex-1 p-6">
        <p className="font-mono text-xs text-muted">
          Investigations / {investigation.referenceNumber} / Witnesses
        </p>
        <h1 className="mt-2 text-xl font-semibold text-foreground">Witnesses</h1>

        <div className="mt-6">
          <WitnessPanel
            investigationId={investigation.id}
            witnesses={witnesses}
            noWitnessesConfirmed={occurrence.noWitnessesConfirmed}
            readOnly={isReadOnly}
          />
        </div>
      </div>
    </div>
  );
}
