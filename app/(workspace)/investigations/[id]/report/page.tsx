import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { composeReport, canViewReport } from "@/lib/services/reportComposer";
import { StageBadge } from "@/components/ui/StageBadge";
import { SeverityBadge } from "@/components/ui/SeverityBadge";
import { RiskBadge } from "@/components/ui/RiskBadge";
import { PriorityBadge } from "@/components/ui/PriorityBadge";
import { ActionStatusBadge } from "@/components/actions/ActionStatusBadge";
import { ActionPriorityBadge } from "@/components/actions/ActionPriorityBadge";
import { ConfidenceLevelBadge } from "@/components/rootcause/ConfidenceLevelBadge";
import { SectionBanner, type BannerKind } from "@/components/report/SectionBanner";
import { isOverdue } from "@/lib/services/overdueComputation";
import { ReportToolbar } from "@/components/report/ReportToolbar";

export const metadata: Metadata = {
  title: "Investigation Report — Aviation Incident Investigation Assistant",
};

// --- Label maps (same wording as the equivalent screen components) --------

const CATEGORY_LABELS: Record<string, string> = {
  AircraftIncident: "Aircraft Incident",
  GroundHandlingIncident: "Ground Handling Incident",
  RampSafetyIncident: "Ramp Safety Incident",
  BaggageIncident: "Baggage Incident",
  CargoIncident: "Cargo Incident",
  DangerousGoodsIncident: "Dangerous Goods Incident",
  PassengerHandlingIncident: "Passenger Handling Incident",
  SecurityRelatedOccurrence: "Security-Related Occurrence",
  OccupationalSafetyIncident: "Occupational Safety Incident",
  EquipmentVehicleIncident: "Equipment/Vehicle Incident",
  MaintenanceRelatedOccurrence: "Maintenance-Related Occurrence",
  EnvironmentalOccurrence: "Environmental Occurrence",
  NearMiss: "Near Miss",
  Other: "Other",
};
const FACTOR_CATEGORY_LABELS: Record<string, string> = {
  HumanFactors: "Human Factors",
  Equipment: "Equipment",
  Environment: "Environment",
  Procedures: "Procedures",
  Training: "Training",
  Supervision: "Supervision",
  Communication: "Communication",
  Organization: "Organization",
  Management: "Management",
  ExternalFactors: "External Factors",
};
const HAZARD_CATEGORY_LABELS: Record<string, string> = {
  HumanFactors: "Human Factors",
  Technical: "Technical",
  Environmental: "Environmental",
  Organizational: "Organizational",
  Other: "Other",
};
const FINDING_TYPE_LABELS: Record<string, string> = {
  Cause: "Cause",
  ContributingFactor: "Contributing Factor",
  RiskObservation: "Risk Observation",
  Other: "Other",
};
const EVIDENCE_TYPE_LABELS: Record<string, string> = {
  Photographs: "Photographs",
  Documents: "Documents",
  Statements: "Statements",
  CCTVReference: "CCTV Reference",
  FlightRecords: "Flight Records",
  MaintenanceRecords: "Maintenance Records",
  GroundHandlingRecords: "Ground Handling Records",
  TrainingRecords: "Training Records",
  Emails: "Emails",
  Other: "Other",
};
const VERIFICATION_METHOD_LABELS: Record<string, string> = {
  FollowUpInspection: "Follow-up Inspection",
  DataReview: "Data Review",
  Audit: "Audit",
  Retest: "Retest",
  StakeholderInterview: "Stakeholder Interview",
  Other: "Other",
};
const EFFECTIVENESS_RESULT_LABELS: Record<string, string> = {
  Effective: "Effective",
  PartiallyEffective: "Partially Effective",
  NotEffective: "Not Effective",
  TooEarlyToAssess: "Too Early to Assess",
};
const EVENT_LABELS: Record<string, string> = {
  Created: "Investigation created",
  InvestigatorAssigned: "Investigator assigned",
  InvestigatorReassigned: "Investigator reassigned",
  StageAdvanced: "Stage advanced",
  SubmittedForReview: "Submitted for review",
  ReviewApproved: "Review: Approved",
  ReviewChangesRequested: "Review: Changes requested",
  Reopened: "Reopened",
  Closed: "Closed",
  DraftDeleted: "Draft deleted",
};

/** camelCase/PascalCase enum value -> readable label, for enums with no bespoke map above. */
function humanize(value: string): string {
  return value.replace(/([a-z0-9])([A-Z])/g, "$1 $2");
}

function orNotProvided<T>(value: T | null | undefined, format?: (v: T) => ReactNode): ReactNode {
  if (value === null || value === undefined || value === "") return "Not provided";
  return format ? format(value) : (value as ReactNode);
}
function orNotEstablished<T>(value: T | null | undefined, format?: (v: T) => ReactNode): ReactNode {
  if (value === null || value === undefined || value === "") return "Not established";
  return format ? format(value) : (value as ReactNode);
}
function dateOnly(d: Date | null | undefined): string | null {
  return d ? d.toISOString().slice(0, 10) : null;
}
function timeOnly(d: Date | null | undefined): string | null {
  return d ? d.toISOString().slice(11, 16) + "Z" : null;
}

// --- Small presentational helpers ------------------------------------------

function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-sm text-slate-900">{value}</p>
    </div>
  );
}

function FieldGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-x-6 gap-y-3 md:grid-cols-3">{children}</div>;
}

function ReportTable({ headers, rows, emptyMessage }: { headers: string[]; rows: ReactNode[][]; emptyMessage: string }) {
  if (rows.length === 0) {
    return <p className="text-sm text-slate-500">{emptyMessage}</p>;
  }
  return (
    <div className="overflow-x-auto break-inside-avoid">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="border-b border-slate-300 text-left uppercase text-slate-500">
            {headers.map((h) => (
              <th key={h} className="px-2 py-1 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-slate-200 align-top">
              {row.map((cell, j) => (
                <td key={j} className="px-2 py-1.5 text-slate-800">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Section({
  itemNumber,
  title,
  banner,
  footnote,
  children,
}: {
  itemNumber: number;
  title: string;
  banner: BannerKind;
  footnote?: string;
  children: ReactNode;
}) {
  return (
    <section id={`item-${itemNumber}`} className="break-before-page py-6">
      <SectionBanner kind={banner} />
      <h2 className="text-base font-semibold text-slate-900">
        {itemNumber}. {title}
      </h2>
      <div className="mt-3 flex flex-col gap-4">{children}</div>
      {footnote && <p className="mt-4 text-[10px] italic text-slate-500">{footnote}</p>}
    </section>
  );
}

/**
 * ui-spec.md §17 Error States: "A section that fails to render shows
 * 'Unable to render this section' inline without failing the whole
 * report." All data is precomputed before render (composeReport), so a
 * per-section throw would only come from a rendering bug — this still
 * isolates it rather than taking down the page.
 */
function renderSection(itemNumber: number, title: string, banner: BannerKind, content: () => ReactNode, footnote?: string) {
  try {
    return (
      <Section itemNumber={itemNumber} title={title} banner={banner} footnote={footnote}>
        {content()}
      </Section>
    );
  } catch {
    return (
      <Section itemNumber={itemNumber} title={title} banner={banner}>
        <p className="text-sm text-red-600">Unable to render this section.</p>
      </Section>
    );
  }
}

const CATEGORY_DISCLAIMER =
  "The occurrence classification taxonomy used here is an internally-defined structure created for this application; it does not represent the official classification methodology of ICAO, any National Aviation Authority, IATA, or any other regulatory or industry body.";
const RISK_MODEL_DISCLAIMER =
  "The risk scoring model and investigation priority scheme used here are internally-defined structures created for this application; they do not represent an official regulatory risk-assessment methodology.";

const DISCLAIMER_TEXT = `This report was generated by the Aviation Incident Investigation Assistant using simulated, fictional data for demonstration purposes only. It is not affiliated with any aviation authority and must not be used for real safety investigations or regulatory reporting. The occurrence classification taxonomy, risk scoring model, and investigation priority scheme used in this report are internally-defined structures created for this application; they do not represent, and must not be presented as, the official classification or risk-assessment methodology of ICAO, any National Aviation Authority, IATA, or any other regulatory or industry body. Any content labeled "Suggested," "Potential," or "Recommended" was generated by a local, rule-based decision-support feature and was reviewed and confirmed (or overridden) by a human investigator before being included here. Every statement in the Investigator Assessment sections of this report, including every item labeled "Potential Root Cause," reflects the investigating team's professional judgment based on available evidence at the time of writing — it is not a proven, official, or legally binding determination of cause.`;

const TOC_ITEMS = [
  "Report Title", "Investigation Number", "Date", "Investigation Status",
  "Occurrence Summary", "Aircraft Information", "Flight Information", "Location",
  "Persons Involved", "Immediate Actions", "Evidence Reviewed", "Established Facts",
  "Hazard Assessment", "Risk Assessment", "Contributing Factors", "5 Whys",
  "Root-Cause Analysis", "Investigation Findings", "Corrective Actions", "Preventive Actions",
  "Investigation Conclusion", "Reviewer Comments", "Closure Information", "Disclaimer",
];

export default async function InvestigationReportPage({ params }: { params: Promise<{ id: string }> }) {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login");

  const { id } = await params;
  const investigationId = Number(id);
  if (!Number.isInteger(investigationId)) notFound();

  const report = await composeReport(investigationId, currentUser);
  if (!report) notFound();

  const { investigation: inv } = report;

  if (!canViewReport(currentUser, inv.status)) {
    return (
      <div className="min-h-screen bg-white p-6">
        <p className="text-sm text-slate-600">
          The report for this investigation becomes available to Viewer accounts once the investigation is Closed.
        </p>
      </div>
    );
  }

  const occ = inv.occurrence;
  const isDraft = inv.status !== "Closed";
  const generatedAt = new Date();

  const REVIEW_HISTORY = report.history.filter((h) =>
    ["ReviewApproved", "ReviewChangesRequested", "Reopened"].includes(h.eventType),
  );

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <ReportToolbar investigationId={inv.id} />

      <style>{`
        @media print {
          @page { margin: 18mm 14mm; }
          .draft-watermark { position: fixed; display: block !important; }
          .report-footer { position: fixed; bottom: 4mm; left: 0; right: 0; }
        }
        .break-before-page { break-before: page; }
      `}</style>

      {isDraft && (
        <div
          className="draft-watermark pointer-events-none fixed inset-0 z-0 hidden items-center justify-center print:flex"
          aria-hidden="true"
        >
          <span className="rotate-[-30deg] text-[120px] font-bold uppercase tracking-widest text-slate-300 opacity-40">
            Draft
          </span>
        </div>
      )}

      <div className="report-footer hidden items-center justify-between px-[14mm] font-mono text-[9px] text-slate-500 print:flex">
        <span>{inv.referenceNumber}</span>
        <span>SIMULATED DATA — DEMONSTRATION PURPOSES ONLY</span>
      </div>

      <main className="relative z-10 mx-auto max-w-4xl px-8 py-10">
        {/* Cover page (items 1-4) */}
        <section className="break-before-page">
          {isDraft && (
            <div className="mb-4 inline-block rounded border border-amber bg-amber/10 px-3 py-1 font-mono text-xs font-semibold uppercase tracking-wide text-amber print:hidden">
              Draft — not yet closed
            </div>
          )}
          <p className="font-mono text-xs uppercase tracking-widest text-slate-500">Aviation Occurrence Investigation Report</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">{inv.title}</h1>

          <FieldGrid>
            <Field label="Investigation Number" value={inv.referenceNumber} />
            <Field label="Occurrence Date" value={orNotProvided(dateOnly(occ?.occurrenceDateUtc))} />
            <Field label="Report Generated" value={`${generatedAt.toISOString().slice(0, 16).replace("T", " ")}Z`} />
            <Field label="Investigation Status" value={<StageBadge status={inv.status} />} />
            <Field label="Occurrence Category" value={occ?.occurrenceCategory ? CATEGORY_LABELS[occ.occurrenceCategory] : "Not provided"} />
            <Field label="Severity" value={<SeverityBadge severity={occ?.severity ?? null} />} />
            <Field label="Investigation Priority" value={<PriorityBadge priority={occ?.investigationPriority ?? null} />} />
          </FieldGrid>

          <p className="mt-6 rounded border border-slate-300 bg-slate-50 p-3 text-xs text-slate-600">
            This application uses simulated, fictional aviation incident data for demonstration purposes only. It is not
            affiliated with any aviation authority and must not be used for real safety investigations or regulatory
            reporting.
          </p>

          <div className="mt-6">
            <p className="text-xs font-semibold uppercase text-slate-500">Contents</p>
            <ol className="mt-2 grid grid-cols-2 gap-x-6 text-xs text-slate-600 md:grid-cols-3">
              {TOC_ITEMS.map((item, i) => (
                <li key={item}>
                  {i + 1}. {item}
                </li>
              ))}
            </ol>
          </div>
        </section>

        {renderSection(
          5,
          "Occurrence Summary",
          "FACTS",
          () => (
            <>
              <FieldGrid>
                <Field label="Occurrence Date (UTC)" value={orNotProvided(dateOnly(occ?.occurrenceDateUtc))} />
                <Field label="Occurrence Time (UTC)" value={orNotProvided(timeOnly(occ?.occurrenceTimeUtc ?? null))} />
                <Field label="Occurrence Time (Local)" value={orNotProvided(timeOnly(occ?.occurrenceTimeLocal ?? null))} />
                <Field label="Phase of Flight" value={orNotProvided(occ?.phaseOfFlight, humanize)} />
                <Field label="Occurrence Category" value={orNotProvided(occ?.occurrenceCategory, (c) => CATEGORY_LABELS[c] ?? c)} />
                <Field label="Occurrence Subcategory" value={orNotProvided(occ?.occurrenceSubcategory?.subcategory)} />
                <Field label="Actual Outcome Severity" value={orNotProvided(occ?.actualOutcomeSeverity)} />
              </FieldGrid>
              <Field label="Brief Description" value={orNotProvided(occ?.briefDescription)} />
              <Field label="Narrative Description" value={orNotProvided(occ?.narrativeDescription)} />
              <Field label="Actual Outcome Description" value={orNotProvided(occ?.actualOutcomeDescription)} />
            </>
          ),
          CATEGORY_DISCLAIMER,
        )}

        {renderSection(6, "Aircraft Information", "FACTS", () =>
          !inv.aircraft ? (
            <p className="text-sm text-slate-500">No aircraft information recorded.</p>
          ) : (
            <FieldGrid>
              <Field label="Registration" value={inv.aircraft.registration} />
              <Field label="Manufacturer" value={inv.aircraft.manufacturer} />
              <Field label="Model" value={inv.aircraft.model} />
              <Field label="Serial Number" value={orNotProvided(inv.aircraft.serialNumber)} />
              <Field label="Year of Manufacture" value={orNotProvided(inv.aircraft.yearOfManufacture)} />
              <Field label="Operator" value={inv.aircraft.operatorName} />
              <Field label="Engine Type" value={orNotProvided(inv.aircraft.engineType)} />
              <Field label="Engine Count" value={inv.aircraft.engineCount} />
              <Field label="Damage Level" value={inv.aircraft.damageLevel} />
            </FieldGrid>
          ),
        )}

        {renderSection(7, "Flight Information", "FACTS", () =>
          !inv.flight ? (
            <p className="text-sm text-slate-500">No flight information recorded.</p>
          ) : (
            <FieldGrid>
              <Field label="Flight Number" value={orNotProvided(inv.flight.flightNumber)} />
              <Field label="Flight Rules" value={inv.flight.flightRules} />
              <Field label="Departure Aerodrome" value={inv.flight.departureAerodrome} />
              <Field label="Destination Aerodrome" value={inv.flight.destinationAerodrome} />
              <Field label="Alternate Aerodrome" value={orNotProvided(inv.flight.alternateAerodrome)} />
              <Field label="PIC Name" value={inv.flight.picName} />
              <Field label="PIC License Number" value={orNotProvided(inv.flight.picLicenseNumber)} />
              <Field label="Crew Complement" value={inv.flight.crewComplement} />
            </FieldGrid>
          ),
        )}

        {renderSection(8, "Location", "FACTS", () =>
          !inv.location ? (
            <p className="text-sm text-slate-500">No location information recorded.</p>
          ) : (
            <FieldGrid>
              <Field label="Location Description" value={inv.location.locationDescription} />
              <Field label="Aerodrome Code" value={orNotProvided(inv.location.aerodromeCode)} />
              <Field
                label="Coordinates"
                value={orNotProvided(
                  inv.location.latitude !== null && inv.location.longitude !== null
                    ? `${inv.location.latitude}, ${inv.location.longitude}`
                    : null,
                )}
              />
              <Field label="Weather / Visibility" value={orNotProvided(inv.location.weatherVisibility)} />
              <Field label="Wind" value={orNotProvided(inv.location.windSpeedKt !== null ? `${inv.location.windSpeedKt} kt / ${inv.location.windDirectionDeg ?? "—"}°` : null)} />
              <Field label="Cloud Cover" value={orNotProvided(inv.location.cloudCover)} />
              <Field label="Temperature" value={orNotProvided(inv.location.temperatureC !== null ? `${inv.location.temperatureC}°C` : null)} />
              <Field label="Precipitation" value={orNotProvided(inv.location.precipitation)} />
              <Field label="Runway in Use" value={orNotProvided(inv.location.runwayInUse)} />
              <Field label="Lighting Conditions" value={inv.location.lightingConditions} />
              <Field label="Terrain Type" value={orNotProvided(inv.location.terrainType)} />
            </FieldGrid>
          ),
        )}

        {renderSection(9, "Persons Involved", "FACTS", () => (
          <>
            {report.injurySummary === null ? (
              <p className="text-sm text-slate-500">Not yet recorded</p>
            ) : occ?.noPersonsInvolvedConfirmed ? (
              <p className="text-sm text-slate-900">No persons were involved in this occurrence.</p>
            ) : (
              <>
                <p className="font-mono text-xs text-slate-600">
                  {report.injurySummary.map((c) => `${c.count} ${c.level}`).join(", ")}
                </p>
                <ReportTable
                  headers={["Name", "Role", "License Number", "Nationality", "Injury Level", "Notes"]}
                  emptyMessage="No persons recorded."
                  rows={inv.persons.map((p) => [
                    p.name,
                    humanize(p.roleType),
                    orNotProvided(p.licenseNumber),
                    orNotProvided(p.nationality),
                    p.injuryLevel,
                    orNotProvided(p.notes),
                  ])}
                />
              </>
            )}
          </>
        ))}

        {renderSection(10, "Immediate Actions", "FACTS", () => (
          <ReportTable
            headers={["Description", "Taken By", "Date/Time", "Action Type"]}
            emptyMessage="No immediate actions recorded."
            rows={inv.immediateActions.map((a) => [
              a.description,
              a.takenBy,
              `${dateOnly(a.occurredAt)} ${timeOnly(a.occurredAt)}`,
              humanize(a.actionType),
            ])}
          />
        ))}

        {renderSection(11, "Evidence Reviewed", "FACTS", () => (
          <>
            {occ?.noEvidenceAvailableConfirmed && inv.evidence.length === 0 ? (
              <p className="text-sm text-slate-900">No evidence was available for this occurrence.</p>
            ) : (
              <ReportTable
                headers={["ID", "Type", "Description", "Source", "Collected By", "Date Obtained", "Assessment", "Related Findings"]}
                emptyMessage="No evidence recorded."
                rows={inv.evidence.map((e) => [
                  `EV-${e.id}`,
                  EVIDENCE_TYPE_LABELS[e.evidenceType] ?? e.evidenceType,
                  e.description,
                  e.source,
                  orNotProvided(e.collectedBy),
                  orNotProvided(dateOnly(e.dateObtained)),
                  <span key="a" className="block">
                    <span className="text-[9px] uppercase text-slate-500">Investigator Assessment</span>
                    <br />
                    Relevance: {orNotEstablished(e.relevance)} · Reliability: {orNotEstablished(e.reliabilityAssessment)}
                    {e.reliabilityNotes ? ` (${e.reliabilityNotes})` : ""}
                    {e.investigatorNotes ? <><br />Notes: {e.investigatorNotes}</> : null}
                  </span>,
                  e.findingLinks.length > 0 ? e.findingLinks.map((l) => `Finding ${l.finding.findingNumber}`).join(", ") : "Not yet linked to a finding",
                ])}
              />
            )}

            <div>
              <p className="text-xs font-semibold uppercase text-slate-500">Witness Statements</p>
              <div className="mt-2">
                <ReportTable
                  headers={["Name", "Witness Type", "Statement Summary", "Statement Date", "Reliability Assessment"]}
                  emptyMessage="No witnesses recorded."
                  rows={inv.witnesses.map((w) => [
                    w.name,
                    humanize(w.witnessType),
                    w.statementSummary,
                    orNotProvided(dateOnly(w.statementDate)),
                    w.reliabilityAssessment,
                  ])}
                />
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase text-slate-500">Attachments</p>
              <div className="mt-2">
                <ReportTable
                  headers={["File Name", "Type", "Size", "Status"]}
                  emptyMessage="No attachments recorded."
                  rows={inv.evidence.flatMap((e) =>
                    e.attachments.map((a) => [
                      a.fileName,
                      a.mimeType,
                      `${Math.ceil(a.fileSizeBytes / 1024)} KB`,
                      a.isSimulated ? (
                        <span key="s" className="rounded-full border border-slate px-2 py-0.5 text-[10px] text-slate-500">
                          Simulated attachment
                        </span>
                      ) : (
                        "Real"
                      ),
                    ]),
                  )}
                />
              </div>
            </div>
          </>
        ))}

        {renderSection(12, "Established Facts", "FACTS", () =>
          report.establishedFacts.length === 0 ? (
            <p className="text-sm text-slate-500">No facts recorded yet.</p>
          ) : (
            <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-900">
              {report.establishedFacts.map((f, i) => (
                <li key={i}>{f.line}</li>
              ))}
            </ol>
          ),
        )}

        {renderSection(
          13,
          "Hazard Assessment",
          "ASSESSMENT",
          () => (
            <ReportTable
              headers={["Description", "Category", "Initial (L/S/Score/Band)", "Existing Controls", "Residual (L/S/Score/Band)"]}
              emptyMessage="No hazards recorded."
              rows={inv.hazards.map((h) => [
                h.description,
                HAZARD_CATEGORY_LABELS[h.hazardCategory] ?? h.hazardCategory,
                `${h.initialLikelihood} / ${h.initialSeverity} / ${h.initialRiskScore} / ${h.initialRiskBand}`,
                orNotProvided(h.existingControls),
                h.residualRiskBand
                  ? `${h.residualLikelihood} / ${h.residualSeverity} / ${h.residualRiskScore} / ${h.residualRiskBand}`
                  : "Not established",
              ])}
            />
          ),
          RISK_MODEL_DISCLAIMER,
        )}

        {renderSection(
          14,
          "Risk Assessment",
          "ASSESSMENT",
          () => (
            <FieldGrid>
              <Field label="Potential Outcome Severity" value={orNotEstablished(occ?.potentialOutcomeSeverity)} />
              <Field label="Potential Outcome Description" value={orNotProvided(occ?.potentialOutcomeDescription)} />
              <Field label="Likelihood of Recurrence" value={orNotEstablished(occ?.likelihoodOfRecurrence)} />
              <Field
                label="Severity"
                value={
                  occ?.severity ? (
                    <>
                      <SeverityBadge severity={occ.severity} />{" "}
                      <span className="text-[10px] text-slate-500">({occ.severityOverridden ? "Overridden" : "Computed"})</span>
                      {occ.severityOverridden && occ.severityOverrideJustification && (
                        <span className="block text-xs text-slate-600">{occ.severityOverrideJustification}</span>
                      )}
                    </>
                  ) : (
                    "Not established"
                  )
                }
              />
              <Field
                label="Risk Score / Band"
                value={
                  occ?.riskScore !== null && occ?.riskScore !== undefined ? (
                    <RiskBadge score={occ.riskScore} band={occ.riskBand} />
                  ) : (
                    "Not established"
                  )
                }
              />
              <Field
                label="Investigation Priority"
                value={
                  occ?.investigationPriority ? (
                    <>
                      <PriorityBadge priority={occ.investigationPriority} />{" "}
                      <span className="text-[10px] text-slate-500">({occ.priorityOverridden ? "Overridden" : "Computed"})</span>
                      {report.categoryFloorApplied && (
                        <span className="block text-xs text-slate-600">
                          Dangerous Goods/Security category floor applied (raised to at least Elevated).
                        </span>
                      )}
                      {occ.priorityOverridden && occ.priorityOverrideJustification && (
                        <span className="block text-xs text-slate-600">{occ.priorityOverrideJustification}</span>
                      )}
                    </>
                  ) : (
                    "Not established"
                  )
                }
              />
            </FieldGrid>
          ),
          RISK_MODEL_DISCLAIMER,
        )}

        {renderSection(15, "Contributing Factors", "ASSESSMENT", () =>
          inv.contributingFactors.length === 0 ? (
            <p className="text-sm text-slate-500">No contributing factors identified.</p>
          ) : (
            <ul className="flex flex-col gap-2 text-sm text-slate-900">
              {inv.contributingFactors.map((f) => (
                <li key={f.id} className="rounded border border-slate-200 p-2">
                  <p className="text-[10px] uppercase text-slate-500">{FACTOR_CATEGORY_LABELS[f.category] ?? f.category}</p>
                  <p>{f.description}</p>
                  {f.hazardLinks.length > 0 && (
                    <p className="mt-1 text-xs text-slate-600">
                      Linked hazards: {f.hazardLinks.map((l) => l.hazard.description).join("; ")}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          ),
        )}

        {renderSection(16, "5 Whys", "ASSESSMENT", () =>
          inv.fiveWhysAnalyses.length === 0 ? (
            <p className="text-sm text-slate-500">No 5 Whys analyses recorded.</p>
          ) : (
            <div className="flex flex-col gap-4">
              {inv.fiveWhysAnalyses.map((a) => (
                <div key={a.id} className="rounded border border-slate-200 p-3">
                  <p className="text-sm font-medium text-slate-900">{a.problemStatement}</p>
                  <ol className="mt-2 list-decimal space-y-1 pl-5 text-xs text-slate-700">
                    {a.entries.map((e) => (
                      <li key={e.id}>
                        <span className="font-medium">Why: </span>
                        {e.question} — <span className="font-medium">Answer: </span>
                        {e.answer}
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>
          ),
        )}

        {renderSection(17, "Root-Cause Analysis", "ASSESSMENT", () =>
          inv.rootCauses.length === 0 ? (
            <p className="text-sm text-slate-500">Not established.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {inv.rootCauses.map((rc) => (
                <div key={rc.id} className="rounded border border-slate-200 p-3">
                  {rc.isInconclusive ? (
                    <>
                      <p className="text-xs font-semibold uppercase text-slate-500">Investigator Assessment</p>
                      <p className="mt-1 text-sm italic text-slate-600">
                        Root cause could not be conclusively identified — {rc.inconclusiveJustification}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-semibold text-slate-900">Potential Root Cause</p>
                      <p className="text-sm text-slate-900">{rc.description}</p>
                      <p className="text-xs text-slate-500">{rc.category ? FACTOR_CATEGORY_LABELS[rc.category] : null}</p>
                      <div className="mt-2 rounded border border-slate-200 bg-slate-50 p-2">
                        <p className="text-[10px] uppercase text-slate-500">Investigator Assessment</p>
                        <div className="mt-1">
                          <ConfidenceLevelBadge confidenceLevel={rc.confidenceLevel} />
                        </div>
                        <p className="mt-1 text-[10px] uppercase text-slate-500">Supporting Evidence</p>
                        <p className="text-sm text-slate-800">{orNotProvided(rc.supportingEvidence)}</p>
                        {rc.investigatorNotes && (
                          <>
                            <p className="mt-1 text-[10px] uppercase text-slate-500">Investigator Notes</p>
                            <p className="text-sm text-slate-800">{rc.investigatorNotes}</p>
                          </>
                        )}
                      </div>
                      {rc.fiveWhysAnalysis && <p className="mt-1 text-xs text-slate-600">5 Whys: {rc.fiveWhysAnalysis.problemStatement}</p>}
                      {rc.contributingFactorLinks.length > 0 && (
                        <p className="mt-1 text-xs text-slate-600">
                          Contributing Factors: {rc.contributingFactorLinks.map((l) => l.contributingFactor.description).join("; ")}
                        </p>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          ),
        )}

        {renderSection(18, "Investigation Findings", "ASSESSMENT", () =>
          inv.findings.length === 0 ? (
            <p className="text-sm text-slate-500">No findings recorded yet.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {inv.findings.map((f) => (
                <div key={f.id} className="rounded border border-slate-200 p-3">
                  <p className="text-sm font-semibold text-slate-900">
                    Finding {f.findingNumber} · {FINDING_TYPE_LABELS[f.findingType] ?? f.findingType}
                  </p>
                  <p className="text-sm text-slate-800">{f.description}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {[
                      f.hazardLinks.length > 0 ? `Hazards: ${f.hazardLinks.map((l) => l.hazard.description).join("; ")}` : null,
                      f.contributingFactorLinks.length > 0
                        ? `Contributing Factors: ${f.contributingFactorLinks.map((l) => l.contributingFactor.description).join("; ")}`
                        : null,
                      f.rootCauseLinks.length > 0 ? `Root Causes: ${f.rootCauseLinks.map((l) => l.rootCause.description).join("; ")}` : null,
                      f.evidenceLinks.length > 0 ? `Evidence: ${f.evidenceLinks.map((l) => `EV-${l.evidence.id}`).join(", ")}` : null,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "No cited items."}
                  </p>
                </div>
              ))}
            </div>
          ),
        )}

        {renderSection(19, "Corrective Actions", "RECOMMENDATIONS", () => (
          <ReportTable
            headers={["ID", "Description", "Addresses", "Responsible", "Department", "Priority", "Target Date", "Status", "Completion", "Verification", "Effectiveness", "Comments", "Required"]}
            emptyMessage="No corrective actions defined."
            rows={inv.correctiveActions.map((a) => [
              `CA-${a.id}`,
              a.description,
              orNotProvided(a.rootCause?.description ?? a.hazard?.description),
              orNotProvided(a.owner?.name ?? a.ownerExternalName),
              orNotProvided(a.department),
              <ActionPriorityBadge key="p" priority={a.priority} />,
              dateOnly(a.targetDate),
              <ActionStatusBadge key="s" status={a.status} overdue={isOverdue(a.targetDate, a.status, generatedAt)} />,
              orNotProvided(dateOnly(a.completedDate)),
              a.status === "Verified" ? orNotEstablished(a.verificationMethod, (m) => VERIFICATION_METHOD_LABELS[m] ?? m) : "Not established",
              a.status === "Verified" ? orNotEstablished(a.effectivenessResult, (r) => EFFECTIVENESS_RESULT_LABELS[r] ?? r) : "Not established",
              orNotProvided(a.investigatorComments),
              a.requiredForClosure ? "Yes" : "No",
            ])}
          />
        ))}

        {renderSection(20, "Preventive Actions", "RECOMMENDATIONS", () => (
          <ReportTable
            headers={["ID", "Description", "Addresses", "Responsible", "Department", "Priority", "Target Date", "Status", "Completion", "Verification", "Effectiveness", "Comments", "Required"]}
            emptyMessage="No preventive actions defined."
            rows={inv.preventiveActions.map((a) => [
              `PA-${a.id}`,
              a.description,
              orNotProvided(a.rootCause?.description ?? a.hazard?.description),
              orNotProvided(a.owner?.name ?? a.ownerExternalName),
              orNotProvided(a.department),
              <ActionPriorityBadge key="p" priority={a.priority} />,
              dateOnly(a.targetDate),
              <ActionStatusBadge key="s" status={a.status} overdue={isOverdue(a.targetDate, a.status, generatedAt)} />,
              orNotProvided(dateOnly(a.completedDate)),
              a.status === "Verified" ? orNotEstablished(a.verificationMethod, (m) => VERIFICATION_METHOD_LABELS[m] ?? m) : "Not established",
              a.status === "Verified" ? orNotEstablished(a.effectivenessResult, (r) => EFFECTIVENESS_RESULT_LABELS[r] ?? r) : "Not established",
              orNotProvided(a.investigatorComments),
              a.requiredForClosure ? "Yes" : "No",
            ])}
          />
        ))}

        {renderSection(21, "Investigation Conclusion", "ASSESSMENT", () =>
          report.conclusion.intro === null ? (
            <p className="text-sm text-slate-500">Not established.</p>
          ) : (
            <>
              <p className="text-sm text-slate-900">{report.conclusion.intro}</p>
              <ul className="list-disc space-y-1 pl-5 text-sm text-slate-900">
                {report.conclusion.lines.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            </>
          ),
        )}

        {renderSection(22, "Reviewer Comments", "ADMIN", () =>
          REVIEW_HISTORY.length === 0 ? (
            <p className="text-sm text-slate-500">No review decisions yet.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {REVIEW_HISTORY.map((h) => (
                <li key={h.id} className="rounded border border-slate-200 p-2 text-sm">
                  <p className="font-medium text-slate-900">{EVENT_LABELS[h.eventType] ?? h.eventType}</p>
                  <p className="text-xs text-slate-500">
                    {h.performedBy.name} · {h.occurredAt.toISOString().slice(0, 16).replace("T", " ")}Z
                  </p>
                  {(h.relatedReview?.comments || h.reasonText) && (
                    <p className="mt-1 text-slate-800">{h.relatedReview?.comments ?? h.reasonText}</p>
                  )}
                </li>
              ))}
            </ul>
          ),
        )}

        {renderSection(23, "Closure Information", "ADMIN", () => (
          <FieldGrid>
            <Field label="Closed At" value={orNotEstablished(dateOnly(inv.closedAt))} />
            <Field label="Reopen Reason" value={orNotProvided(inv.reopenReason)} />
            <Field
              label="Closure Gate Override"
              value={
                report.overrideCloseEvent
                  ? `Closure gate was bypassed by an Administrator. Justification: ${report.overrideCloseEvent.reasonText}`
                  : "No override was used."
              }
            />
          </FieldGrid>
        ))}

        {renderSection(24, "Disclaimer", "STANDING", () => (
          <p className="whitespace-pre-line text-sm leading-relaxed text-slate-800">{DISCLAIMER_TEXT}</p>
        ))}

        {/* Appendices (supplementary, not among the 24 numbered items) */}
        <section className="break-before-page py-6">
          <h2 className="text-base font-semibold text-slate-900">Appendix A — Evidence &amp; Attachment Index</h2>
          <div className="mt-3">
            <ReportTable
              headers={["File Name", "Type", "Size", "Uploaded By", "Status"]}
              emptyMessage="No attachments recorded."
              rows={inv.evidence.flatMap((e) =>
                e.attachments.map((a) => [
                  a.fileName,
                  a.mimeType,
                  `${Math.ceil(a.fileSizeBytes / 1024)} KB`,
                  a.uploadedBy.name,
                  a.isSimulated ? "Simulated" : "Real",
                ]),
              )}
            />
          </div>
        </section>

        <section className="break-before-page py-6">
          <h2 className="text-base font-semibold text-slate-900">Appendix B — Witness Contact Index</h2>
          <p className="mt-1 text-xs italic text-slate-500">Sensitive — separated from statement content per witness privacy practice.</p>
          <div className="mt-3 rounded border border-slate-300 bg-slate-50 p-3">
            <ReportTable
              headers={["Name", "Contact Information"]}
              emptyMessage="No witnesses recorded."
              rows={inv.witnesses.map((w) => [w.name, orNotProvided(w.contactInfo)])}
            />
          </div>
        </section>

        <section className="break-before-page py-6">
          <h2 className="text-base font-semibold text-slate-900">Appendix C — Full Audit Metadata</h2>
          <FieldGrid>
            <Field label="Created At" value={`${dateOnly(inv.createdAt)} ${timeOnly(inv.createdAt)}`} />
            <Field label="Updated At" value={`${dateOnly(inv.updatedAt)} ${timeOnly(inv.updatedAt)}`} />
            <Field label="Closed At" value={orNotEstablished(dateOnly(inv.closedAt))} />
            <Field label="Created By" value={inv.createdBy.name} />
            <Field label="Assigned Investigator" value={orNotProvided(inv.assignedInvestigator?.name)} />
          </FieldGrid>
          <div className="mt-4">
            <ReportTable
              headers={["Event", "From → To", "Performed By", "Reason", "When"]}
              emptyMessage="No history recorded."
              rows={report.history.map((h) => [
                EVENT_LABELS[h.eventType] ?? h.eventType,
                h.fromStatus && h.toStatus ? `${h.fromStatus} → ${h.toStatus}` : "—",
                h.performedBy.name,
                orNotProvided(h.reasonText),
                `${dateOnly(h.occurredAt)} ${timeOnly(h.occurredAt)}`,
              ])}
            />
          </div>
        </section>
      </main>
    </div>
  );
}
