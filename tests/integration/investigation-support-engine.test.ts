import { describe, expect, it, afterAll } from "vitest";
import { db } from "@/lib/db";
import { SUPPORT_LABELS } from "@/lib/services/investigationSupportEngine/labels";
import { getChecklistSuggestions } from "@/lib/services/investigationSupportEngine/checklistSuggestions";
import { getMissingInformationWarnings } from "@/lib/services/investigationSupportEngine/missingInfoWarnings";
import { getCompletenessScore } from "@/lib/services/investigationSupportEngine/completenessScore";
import { getRiskWarnings } from "@/lib/services/investigationSupportEngine/riskWarnings";
import { getActionReminders } from "@/lib/services/investigationSupportEngine/actionReminders";
import { getReportQualityChecks } from "@/lib/services/investigationSupportEngine/reportQualityChecks";

/**
 * assistance-engine.md's six new Category A capabilities (§4.1/§4.2/§4.4/
 * §4.6/§4.7/§4.8), testing-spec.md §4.7 (TS-034/TS-035/TS-036). Every
 * result's `label` is checked against labels.ts's single source of truth
 * so no capability can drift from the mandated wording.
 */
describe.skipIf(!process.env.DATABASE_URL)("Investigation Support Engine (assistance-engine.md §4)", () => {
  afterAll(async () => {
    await db.investigation.deleteMany({ where: { title: { startsWith: "TEST-FIXTURE-SUPPORT-" } } });
    await db.$disconnect();
  });

  async function investigator() {
    return db.user.findUniqueOrThrow({ where: { email: "r.okafor@investigations.example" } });
  }

  async function createInvestigation(title: string, overrides: Record<string, unknown> = {}) {
    const user = await investigator();
    return db.investigation.create({
      data: {
        referenceNumber: `INC-TEST-${Math.random().toString(36).slice(2, 10)}`,
        title: `TEST-FIXTURE-SUPPORT-${title}`,
        status: "Draft",
        reporterName: "Test Reporter",
        createdByUserId: user.id,
        assignedInvestigatorUserId: user.id,
        occurrence: { create: { occurrenceDateUtc: new Date("2026-03-15") } },
        ...overrides,
      },
    });
  }

  describe("Checklist Suggestions (FR-075)", () => {
    it("suggests the exact unmet Draft -> Open gate items, capped at 5, labeled correctly", async () => {
      const investigation = await createInvestigation("checklist-draft", { assignedInvestigatorUserId: null });
      const result = await getChecklistSuggestions(investigation.id);
      expect(result.label).toBe(SUPPORT_LABELS.checklistSuggestion);
      expect(result.suggestions.length).toBeGreaterThan(0);
      expect(result.suggestions.length).toBeLessThanOrEqual(5);
      expect(result.suggestions.some((s) => s.message.includes("Investigator"))).toBe(true);
    });

    it("returns no suggestions for a Closed investigation", async () => {
      const investigation = await createInvestigation("checklist-closed", { status: "Closed" });
      const result = await getChecklistSuggestions(investigation.id);
      expect(result.suggestions).toEqual([]);
    });
  });

  describe("Missing-Information Warnings (FR-076, TS-034)", () => {
    it("suppresses Persons-related warnings entirely when noPersonsInvolvedConfirmed = TRUE (TS-034)", async () => {
      const investigation = await createInvestigation("missinginfo-suppressed", {
        occurrence: { create: { occurrenceDateUtc: new Date("2026-03-15"), noPersonsInvolvedConfirmed: true } },
      });
      const result = await getMissingInformationWarnings(investigation.id);
      expect(result.label).toBe(SUPPORT_LABELS.missingInformationWarning);
      expect(result.warnings.some((w) => w.message.includes("License Number"))).toBe(false);
    });

    it("warns about a PIC with no License Number when persons ARE recorded", async () => {
      const investigation = await createInvestigation("missinginfo-pic");
      await db.person.create({
        data: { investigationId: investigation.id, name: "Capt. Test", roleType: "PIC" },
      });
      const result = await getMissingInformationWarnings(investigation.id);
      expect(result.warnings.some((w) => w.message.includes("License Number is not recorded for Capt. Test"))).toBe(true);
    });

    it("produces zero warnings for a section with every curated field populated", async () => {
      const investigation = await createInvestigation("missinginfo-clean");
      await db.aircraft.create({
        data: {
          investigationId: investigation.id,
          registration: "N1",
          manufacturer: "Boeing",
          model: "737",
          serialNumber: "SN-1",
          operatorName: "Test Air",
        },
      });
      const result = await getMissingInformationWarnings(investigation.id);
      expect(result.warnings.some((w) => w.message.includes("Serial Number"))).toBe(false);
    });
  });

  describe("Investigation Completeness Score (FR-077, TS-035)", () => {
    it("scores only Draft-relevant fields for a bare Draft investigation, never penalizing later-stage gaps (TS-035)", async () => {
      const investigation = await createInvestigation("completeness-draft", { assignedInvestigatorUserId: null });
      const result = await getCompletenessScore(investigation.id);
      expect(result.label).toBe(SUPPORT_LABELS.completenessScore);
      expect(result.percent).toBeGreaterThanOrEqual(0);
      expect(result.percent).toBeLessThan(100);
      expect(result.caption).toBe("Reflects data completeness only — not investigation quality or correctness.");
      const sectionNames = result.sections.map((s) => s.section);
      expect(sectionNames).not.toContain("Aircraft");
      expect(sectionNames).not.toContain("Root Cause Analysis");
    });

    it("includes Aircraft/Flight/Location sections once the investigation reaches Under Investigation", async () => {
      const investigation = await createInvestigation("completeness-underinv", { status: "UnderInvestigation" });
      const result = await getCompletenessScore(investigation.id);
      const sectionNames = result.sections.map((s) => s.section);
      expect(sectionNames).toContain("Aircraft");
      expect(sectionNames).not.toContain("Root Cause Analysis");
    });
  });

  describe("Risk Warnings (FR-078)", () => {
    it("warns about a High/Critical residual risk hazard with no linked Preventive Action", async () => {
      const investigation = await createInvestigation("risk-residual");
      await db.hazard.create({
        data: {
          investigationId: investigation.id,
          description: "Wet runway with degraded braking action",
          hazardCategory: "Environmental",
          initialLikelihood: "Likely",
          initialSeverity: "Major",
          initialRiskScore: 16,
          initialRiskBand: "High",
          residualLikelihood: "Possible",
          residualSeverity: "Major",
          residualRiskScore: 12,
          residualRiskBand: "High",
        },
      });
      const result = await getRiskWarnings(investigation.id);
      expect(result.label).toBe(SUPPORT_LABELS.riskWarning);
      expect(result.warnings.some((w) => w.message.includes("residual risk band with no linked Preventive Action"))).toBe(true);
    });

    it("does not warn once a Preventive Action is linked to the high-residual hazard", async () => {
      const investigation = await createInvestigation("risk-mitigated");
      const user = await investigator();
      const hazard = await db.hazard.create({
        data: {
          investigationId: investigation.id,
          description: "Wet runway with degraded braking action",
          hazardCategory: "Environmental",
          initialLikelihood: "Likely",
          initialSeverity: "Major",
          initialRiskScore: 16,
          initialRiskBand: "High",
          residualLikelihood: "Possible",
          residualSeverity: "Major",
          residualRiskScore: 12,
          residualRiskBand: "High",
        },
      });
      await db.preventiveAction.create({
        data: {
          investigationId: investigation.id,
          description: "Resurface runway grooving.",
          priority: "High",
          targetDate: new Date("2026-12-01"),
          ownerUserId: user.id,
          hazardId: hazard.id,
        },
      });
      const result = await getRiskWarnings(investigation.id);
      expect(result.warnings.some((w) => w.message.includes(hazard.description))).toBe(false);
    });
  });

  describe("Corrective-Action Reminders (FR-079)", () => {
    it("reminds about an action due within 7 days", async () => {
      const investigation = await createInvestigation("reminder-due-soon");
      const user = await investigator();
      const dueSoon = new Date();
      dueSoon.setDate(dueSoon.getDate() + 3);
      await db.correctiveAction.create({
        data: {
          investigationId: investigation.id,
          description: "Inspect brake assembly.",
          priority: "High",
          targetDate: dueSoon,
          ownerUserId: user.id,
        },
      });
      const result = await getActionReminders(investigation.id);
      expect(result.label).toBe(SUPPORT_LABELS.actionReminder);
      expect(result.reminders.some((r) => r.message.includes("Inspect brake assembly"))).toBe(true);
    });

    it("never reminds about a Completed action regardless of date", async () => {
      const investigation = await createInvestigation("reminder-completed");
      const user = await investigator();
      const overdue = new Date("2020-01-01");
      await db.correctiveAction.create({
        data: {
          investigationId: investigation.id,
          description: "Long-completed action.",
          priority: "Low",
          status: "Completed",
          targetDate: overdue,
          ownerUserId: user.id,
        },
      });
      const result = await getActionReminders(investigation.id);
      expect(result.reminders.some((r) => r.message.includes("Long-completed action"))).toBe(false);
    });
  });

  describe("Report Quality Checks (FR-080, TS-036)", () => {
    it("returns exactly 3 items for a fixture with 3 known 'Not established' gaps, no extras or omissions (TS-036)", async () => {
      const investigation = await createInvestigation("reportquality-3gaps");
      const user = await investigator();

      // Gap 1: Hazard with no residual assessment.
      await db.hazard.create({
        data: {
          investigationId: investigation.id,
          description: "Wet runway hazard",
          hazardCategory: "Environmental",
          initialLikelihood: "Likely",
          initialSeverity: "Major",
          initialRiskScore: 16,
          initialRiskBand: "High",
        },
      });

      // Gap 2: occurrence risk fields incomplete (occurrence created bare, no outcome fields).

      // Non-gap: a complete, non-inconclusive Root Cause (avoids the
      // Root-Cause-Analysis and Investigation-Conclusion checks firing).
      await db.rootCause.create({
        data: {
          investigationId: investigation.id,
          description: "Checklist step skipped under time pressure.",
          category: "Procedures",
          supportingEvidence: "Crew statement corroborates this.",
          confidenceLevel: "Medium",
        },
      });

      // Non-gap: a Finding (also avoids the Investigation-Conclusion check).
      await db.investigationFinding.create({
        data: {
          investigationId: investigation.id,
          findingNumber: 1,
          findingType: "Cause",
          description: "The excursion was caused by degraded braking action on a wet surface.",
          createdByUserId: user.id,
        },
      });

      // Gap 3: a Verified action with no Verification Method/Effectiveness Result recorded.
      await db.correctiveAction.create({
        data: {
          investigationId: investigation.id,
          description: "Resurface runway grooving.",
          priority: "High",
          status: "Verified",
          targetDate: new Date("2026-12-01"),
          ownerUserId: user.id,
        },
      });

      const result = await getReportQualityChecks(investigation.id);
      expect(result.label).toBe(SUPPORT_LABELS.reportQualityCheck);
      expect(result.issues).toHaveLength(3);
      expect(result.allClearMessage).toBeNull();
      expect(result.issues.some((i) => i.message.includes("Residual Risk Assessment not established"))).toBe(true);
      expect(result.issues.some((i) => i.message.includes("Risk Assessment (Severity, Risk Score, Investigation Priority) not established"))).toBe(true);
      expect(result.issues.some((i) => i.message.includes("Verified but Verification Method or Effectiveness Result is not established"))).toBe(true);
    });

    it("returns the explicit all-clear message when nothing is outstanding", async () => {
      const investigation = await createInvestigation("reportquality-clean", {
        occurrence: {
          create: {
            occurrenceDateUtc: new Date("2026-03-15"),
            actualOutcomeSeverity: "Minor",
            potentialOutcomeSeverity: "Major",
            likelihoodOfRecurrence: "Possible",
          },
        },
      });
      const user = await investigator();
      await db.investigationFinding.create({
        data: {
          investigationId: investigation.id,
          findingNumber: 1,
          findingType: "Other",
          description: "A standalone finding with no gaps in its own record.",
          createdByUserId: user.id,
        },
      });
      await db.rootCause.create({
        data: {
          investigationId: investigation.id,
          description: "Checklist step skipped under time pressure.",
          category: "Procedures",
          supportingEvidence: "Crew statement corroborates this.",
          confidenceLevel: "Medium",
        },
      });
      const result = await getReportQualityChecks(investigation.id);
      expect(result.issues).toEqual([]);
      expect(result.allClearMessage).toBe("No report quality issues found.");
    });
  });
});
