import Link from "next/link";
import { CompletenessIndicator, type CompletenessState } from "./CompletenessIndicator";

/**
 * Section Stepper (ui-spec.md §2.3) — the investigation workspace's left
 * rail, listing all 13 workspace pages (ui-spec.md §3's page-to-module
 * mapping). Overview, Occurrence Details, Aircraft & Flight, Evidence,
 * Witnesses, and Hazard Analysis are real routes as of Phases 4-7; the
 * remaining 7 pages arrive in Phases 8-13 and are shown as non-clickable
 * stepper entries (not broken links) until then, with a "Not Started"
 * CompletenessDot — honest about what's actually built rather than
 * linking to 404s.
 */
interface StepperSection {
  key: string;
  label: string;
  href?: string;
  completeness: CompletenessState;
}

export function SectionStepper({
  investigationId,
  occurrenceCompleteness = "not-started",
  aircraftFlightCompleteness = "not-started",
  evidenceCompleteness = "not-started",
  witnessesCompleteness = "not-started",
  hazardsCompleteness = "not-started",
}: {
  investigationId: number;
  occurrenceCompleteness?: CompletenessState;
  aircraftFlightCompleteness?: CompletenessState;
  evidenceCompleteness?: CompletenessState;
  witnessesCompleteness?: CompletenessState;
  hazardsCompleteness?: CompletenessState;
}) {
  const sections: StepperSection[] = [
    { key: "overview", label: "Overview", href: `/investigations/${investigationId}`, completeness: "not-started" },
    {
      key: "occurrence",
      label: "Occurrence Details",
      href: `/investigations/${investigationId}/occurrence`,
      completeness: occurrenceCompleteness,
    },
    {
      key: "aircraft-flight",
      label: "Aircraft & Flight",
      href: `/investigations/${investigationId}/aircraft-flight`,
      completeness: aircraftFlightCompleteness,
    },
    {
      key: "evidence",
      label: "Evidence",
      href: `/investigations/${investigationId}/evidence`,
      completeness: evidenceCompleteness,
    },
    {
      key: "witnesses",
      label: "Witnesses",
      href: `/investigations/${investigationId}/witnesses`,
      completeness: witnessesCompleteness,
    },
    { key: "findings", label: "Investigation Findings", completeness: "not-started" },
    {
      key: "hazards",
      label: "Hazard Analysis",
      href: `/investigations/${investigationId}/hazards`,
      completeness: hazardsCompleteness,
    },
    { key: "contributing-factors", label: "Contributing Factors", completeness: "not-started" },
    { key: "five-whys", label: "5 Whys", completeness: "not-started" },
    { key: "root-cause", label: "Root Cause Analysis", completeness: "not-started" },
    { key: "actions", label: "Corrective/Preventive Actions", completeness: "not-started" },
    { key: "review", label: "Investigation Review", completeness: "not-started" },
    { key: "report", label: "Report Preview", completeness: "not-started" },
  ];

  return (
    <nav aria-label="Investigation sections" className="w-56 flex-shrink-0 border-r border-border p-3">
      <ul className="space-y-1">
        {sections.map((section) =>
          section.href ? (
            <li key={section.key}>
              <Link
                href={section.href}
                className="flex items-center gap-2 rounded px-2 py-1.5 text-sm text-foreground hover:bg-surface"
              >
                <CompletenessIndicator state={section.completeness} />
                {section.label}
              </Link>
            </li>
          ) : (
            <li key={section.key}>
              <span className="flex cursor-not-allowed items-center gap-2 rounded px-2 py-1.5 text-sm text-muted">
                <CompletenessIndicator state={section.completeness} />
                {section.label}
              </span>
            </li>
          ),
        )}
      </ul>
    </nav>
  );
}
