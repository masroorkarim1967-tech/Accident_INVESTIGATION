import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { db } from "@/lib/db";
import { getInvestigationDetail } from "@/lib/services/investigationQueries";
import { SectionStepper } from "@/components/investigations/SectionStepper";
import { AircraftFlightTabs } from "@/components/occurrence/AircraftFlightTabs";

/** FR-013 (Aircraft), FR-014 (Flight), FR-015 (Location) — ui-spec.md §7's three-tab layout. */
export default async function AircraftFlightPage({ params }: { params: Promise<{ id: string }> }) {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login");

  const { id } = await params;
  const investigationId = Number(id);
  if (!Number.isInteger(investigationId)) notFound();

  const investigation = await getInvestigationDetail(investigationId, currentUser);
  if (!investigation) notFound();

  const [aircraft, flight, location] = await Promise.all([
    db.aircraft.findUnique({ where: { investigationId } }),
    db.flight.findUnique({ where: { investigationId } }),
    db.location.findUnique({ where: { investigationId } }),
  ]);

  const isReadOnly = investigation.status === "Review" || investigation.status === "Closed";

  return (
    <div className="flex flex-col md:flex-row">
      <SectionStepper
        investigationId={investigation.id}
        aircraftFlightCompleteness={aircraft || flight || location ? "in-progress" : "not-started"}
      />
      <div className="flex-1 p-6">
        <p className="font-mono text-xs text-muted">
          Investigations / {investigation.referenceNumber} / Aircraft &amp; Flight
        </p>
        <h1 className="mt-2 text-xl font-semibold text-foreground">Aircraft &amp; Flight</h1>

        <div className="mt-6">
          <AircraftFlightTabs
            investigationId={investigation.id}
            aircraft={aircraft}
            flight={flight}
            location={location}
            readOnly={isReadOnly}
          />
        </div>
      </div>
    </div>
  );
}
