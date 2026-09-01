import { db } from "@/lib/db";
import { SUPPORT_LABELS } from "./labels";

/**
 * assistance-engine.md §4.8 — Report Quality Checks. Category A, Definite.
 * Deliberately does not invent a parallel gap-detection mechanism — it
 * enumerates the "Not established" placeholder occurrences report-spec.md
 * §5.9/§5.10/§5.13/§5.17 already define for the analytical (Investigator
 * Assessment) sections, structural completeness only, never a
 * writing-quality or narrative-tone judgment. "Not provided" gaps for
 * purely biographical/optional fields (report-spec.md §5.1–§5.7) are the
 * job of Missing-Information Warnings (§4.2); some deliberate overlap on
 * genuinely analytical fields (e.g. an action's Department) is expected
 * and acceptable (§3.7's "not required to be mutually exclusive"), but
 * this capability's own scope is the structural, report-facing gaps.
 * Always renders a result, positive or negative — unlike Missing-
 * Information Warnings, silence alone would be ambiguous here.
 */
export interface ReportQualityIssue {
  message: string;
  href: string;
}

export interface ReportQualityChecksResult {
  label: string;
  issues: ReportQualityIssue[];
  allClearMessage: string | null;
}

function href(investigationId: number, section: string): string {
  return `/investigations/${investigationId}/${section}`;
}

export async function getReportQualityChecks(investigationId: number): Promise<ReportQualityChecksResult> {
  const investigation = await db.investigation.findUnique({
    where: { id: investigationId },
    include: {
      occurrence: true,
      hazards: true,
      rootCauses: true,
      findings: true,
      correctiveActions: true,
      preventiveActions: true,
    },
  });

  const label = SUPPORT_LABELS.reportQualityCheck;
  if (!investigation) return { label, issues: [], allClearMessage: null };

  const issues: ReportQualityIssue[] = [];
  const occ = investigation.occurrence;

  // report-spec.md §5.9 — residual assessment not established.
  for (const hazard of investigation.hazards) {
    if (!hazard.residualRiskBand) {
      issues.push({
        message: `"${hazard.description.slice(0, 60)}" — Residual Risk Assessment not established.`,
        href: href(investigationId, "hazards"),
      });
    }
  }

  // report-spec.md §5.10 — occurrence-level risk assessment not established.
  if (!occ?.actualOutcomeSeverity || !occ?.potentialOutcomeSeverity || !occ?.likelihoodOfRecurrence) {
    issues.push({
      message: "Risk Assessment (Severity, Risk Score, Investigation Priority) not established.",
      href: href(investigationId, "occurrence"),
    });
  }

  // report-spec.md §5.13 — root-cause analysis not established.
  if (investigation.rootCauses.length === 0) {
    issues.push({
      message: "Root-Cause Analysis — Not established. No Potential Root Cause recorded.",
      href: href(investigationId, "root-causes"),
    });
  }

  // report-spec.md §5.15/§5.16 — verification not established on a Verified action.
  for (const action of [...investigation.correctiveActions, ...investigation.preventiveActions]) {
    if (action.status === "Verified" && (!action.verificationMethod || !action.effectivenessResult)) {
      issues.push({
        message: `"${action.description.slice(0, 60)}" is Verified but Verification Method or Effectiveness Result is not established.`,
        href: href(investigationId, "actions"),
      });
    }
  }

  // report-spec.md §5.17 — investigation conclusion not established.
  if (investigation.findings.length === 0 && investigation.rootCauses.length === 0) {
    issues.push({
      message: "Investigation Conclusion — Not established. No Findings or Potential Root Causes recorded.",
      href: href(investigationId, "findings"),
    });
  }

  return {
    label,
    issues,
    allClearMessage: issues.length === 0 ? "No report quality issues found." : null,
  };
}
