"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { CompletenessIndicator, type CompletenessState } from "./CompletenessIndicator";

/**
 * Section Stepper (ui-spec.md §2.3) — the investigation workspace's left
 * rail, listing all 13 workspace pages (ui-spec.md §3's page-to-module
 * mapping). Every section is now a real route as of Phase 13.
 *
 * ui-spec.md §6 (Mobile, <768px): collapses into a "Jump to section"
 * dropdown instead of the left rail — below that width the fixed-width
 * rail pushed every investigation sub-page into horizontal body scroll
 * (testing-spec.md TS-042/TS-045, found during the Phase 14 pass).
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
  contributingFactorsCompleteness = "not-started",
  fiveWhysCompleteness = "not-started",
  rootCauseCompleteness = "not-started",
  actionsCompleteness = "not-started",
  findingsCompleteness = "not-started",
  reviewCompleteness = "not-started",
}: {
  investigationId: number;
  occurrenceCompleteness?: CompletenessState;
  aircraftFlightCompleteness?: CompletenessState;
  evidenceCompleteness?: CompletenessState;
  witnessesCompleteness?: CompletenessState;
  hazardsCompleteness?: CompletenessState;
  contributingFactorsCompleteness?: CompletenessState;
  fiveWhysCompleteness?: CompletenessState;
  rootCauseCompleteness?: CompletenessState;
  actionsCompleteness?: CompletenessState;
  findingsCompleteness?: CompletenessState;
  reviewCompleteness?: CompletenessState;
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
    {
      key: "findings",
      label: "Investigation Findings",
      href: `/investigations/${investigationId}/findings`,
      completeness: findingsCompleteness,
    },
    {
      key: "hazards",
      label: "Hazard Analysis",
      href: `/investigations/${investigationId}/hazards`,
      completeness: hazardsCompleteness,
    },
    {
      key: "contributing-factors",
      label: "Contributing Factors",
      href: `/investigations/${investigationId}/contributing-factors`,
      completeness: contributingFactorsCompleteness,
    },
    {
      key: "five-whys",
      label: "5 Whys",
      href: `/investigations/${investigationId}/five-whys`,
      completeness: fiveWhysCompleteness,
    },
    {
      key: "root-cause",
      label: "Root Cause Analysis",
      href: `/investigations/${investigationId}/root-causes`,
      completeness: rootCauseCompleteness,
    },
    {
      key: "actions",
      label: "Corrective/Preventive Actions",
      href: `/investigations/${investigationId}/actions`,
      completeness: actionsCompleteness,
    },
    {
      key: "review",
      label: "Investigation Review",
      href: `/investigations/${investigationId}/review`,
      completeness: reviewCompleteness,
    },
    { key: "report", label: "Report Preview", href: `/investigations/${investigationId}/report`, completeness: "not-started" },
  ];

  const router = useRouter();
  const pathname = usePathname();
  const currentHref = sections.find((s) => s.href === pathname)?.href ?? "";

  return (
    <>
      <div className="border-b border-border p-3 md:hidden">
        <label htmlFor="section-jump" className="sr-only">
          Jump to section
        </label>
        <select
          id="section-jump"
          aria-label="Jump to section"
          value={currentHref}
          onChange={(e) => {
            if (e.target.value) router.push(e.target.value);
          }}
          className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm text-foreground"
        >
          {sections.map((section) =>
            section.href ? (
              <option key={section.key} value={section.href}>
                {section.label}
              </option>
            ) : (
              <option key={section.key} value="" disabled>
                {section.label} (unavailable)
              </option>
            ),
          )}
        </select>
      </div>

      <nav aria-label="Investigation sections" className="hidden w-56 flex-shrink-0 border-r border-border p-3 md:block">
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
    </>
  );
}
