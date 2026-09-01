import Link from "next/link";
import { CompletenessIndicator, type CompletenessState } from "./CompletenessIndicator";

/**
 * Section Stepper (ui-spec.md §2.3) — the investigation workspace's left
 * rail, listing all 13 workspace pages (ui-spec.md §3's page-to-module
 * mapping). Only "Overview" is a real route this phase; the other 12
 * pages arrive in Phases 5-13 and are shown as non-clickable stepper
 * entries (not broken links) until then, with a "Not Started"
 * CompletenessDot — matching FR-010's stated empty state, and honest
 * about what this phase actually built rather than linking to 404s.
 */
interface StepperSection {
  key: string;
  label: string;
  href?: string;
  completeness: CompletenessState;
}

export function SectionStepper({
  investigationId,
  occurrenceStarted,
}: {
  investigationId: number;
  occurrenceStarted: boolean;
}) {
  const sections: StepperSection[] = [
    { key: "overview", label: "Overview", href: `/investigations/${investigationId}`, completeness: "not-started" },
    {
      key: "occurrence",
      label: "Occurrence Details",
      completeness: occurrenceStarted ? "in-progress" : "not-started",
    },
    { key: "aircraft-flight", label: "Aircraft & Flight", completeness: "not-started" },
    { key: "evidence", label: "Evidence", completeness: "not-started" },
    { key: "witnesses", label: "Witnesses", completeness: "not-started" },
    { key: "findings", label: "Investigation Findings", completeness: "not-started" },
    { key: "hazards", label: "Hazard Analysis", completeness: "not-started" },
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
