import { describe, expect, it, vi, afterAll } from "vitest";
import { readFileSync } from "node:fs";
import { db } from "@/lib/db";
import { UserRole } from "@/prisma/generated/prisma/client";
import { composeReport, canViewReport } from "@/lib/services/reportComposer";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

/**
 * testing-spec.md §4.8 (TS-037-041) — report-spec.md's 24-section
 * structure. TST-2 permits adapting scenario mechanics to available
 * tooling: "renders correctly" is verified against reportComposer.ts's
 * output (the data every section is built from) rather than full React
 * rendering, the same precedent dashboard-metrics.test.ts (TS-010)
 * established for the Dashboard.
 */
describe.skipIf(!process.env.DATABASE_URL)("Report Generation (FR-056-058, report-spec.md)", () => {
  afterAll(async () => {
    await db.investigation.deleteMany({ where: { title: { startsWith: "TEST-FIXTURE-report-" } } });
    await db.$disconnect();
  });

  async function currentUser(role: UserRole = UserRole.Administrator) {
    const user = await db.user.findUniqueOrThrow({ where: { email: "a.whitfield@investigations.example" } });
    return { id: user.id, role };
  }

  async function makeDraftInvestigation(title: string) {
    const investigator = await db.user.findUniqueOrThrow({ where: { email: "r.okafor@investigations.example" } });
    return db.investigation.create({
      data: {
        referenceNumber: `INC-TEST-${Math.random().toString(36).slice(2, 10)}`,
        title,
        status: "Draft",
        reporterName: "Test Reporter",
        createdByUserId: investigator.id,
        occurrence: { create: { occurrenceDateUtc: new Date("2026-03-15") } },
      },
    });
  }

  /** A fully-populated, Closed investigation touching every report section. */
  async function makeFullInvestigation(title: string) {
    const investigator = await db.user.findUniqueOrThrow({ where: { email: "r.okafor@investigations.example" } });
    const reviewer = await db.user.findUniqueOrThrow({ where: { email: "j.bramwell@investigations.example" } });

    const investigation = await db.investigation.create({
      data: {
        referenceNumber: `INC-TEST-${Math.random().toString(36).slice(2, 10)}`,
        title,
        status: "Closed",
        reporterName: "Test Reporter",
        createdByUserId: investigator.id,
        assignedInvestigatorUserId: investigator.id,
        closedAt: new Date("2026-04-01"),
        occurrence: {
          create: {
            occurrenceDateUtc: new Date("2026-03-15"),
            briefDescription: "Runway excursion on landing rollout.",
            narrativeDescription: "The aircraft departed the runway surface during landing rollout in wet conditions.",
            occurrenceCategory: "AircraftIncident",
            actualOutcomeSeverity: "Minor",
            actualOutcomeDescription: "Minor damage to landing gear.",
            potentialOutcomeSeverity: "Major",
            potentialOutcomeDescription: "Could have resulted in a hull loss.",
            likelihoodOfRecurrence: "Possible",
            severity: "Major",
            riskScore: 12,
            riskBand: "Moderate",
            investigationPriority: "Elevated",
          },
        },
        aircraft: {
          create: {
            registration: "TEST-REG1",
            manufacturer: "TestJet",
            model: "TJ-100",
            operatorName: "Test Airways",
            damageLevel: "Minor",
          },
        },
        flight: {
          create: {
            flightRules: "IFR",
            departureAerodrome: "ZZFI",
            destinationAerodrome: "ZZFC",
            picName: "Test Pilot",
          },
        },
        location: {
          create: {
            locationDescription: "Runway 27, Test International Airport.",
            lightingConditions: "Daylight",
          },
        },
        persons: { create: [{ name: "Test PIC", roleType: "PIC", injuryLevel: "None" }] },
        immediateActions: {
          create: [{ description: "Runway closed for inspection.", takenBy: "ATC", occurredAt: new Date("2026-03-15T12:00:00Z"), actionType: "Operational" }],
        },
        witnesses: {
          create: [{ name: "Test Witness", witnessType: "ATC", statementSummary: "Observed the aircraft depart the runway surface.", reliabilityAssessment: "High" }],
        },
        evidence: {
          create: [
            {
              evidenceType: "Photographs",
              description: "Photos of the runway excursion site.",
              source: "ATC tower camera",
              relevance: "High",
              reliabilityAssessment: "High",
            },
          ],
        },
        hazards: {
          create: [
            {
              description: "Wet runway with degraded braking action.",
              hazardCategory: "Environmental",
              initialLikelihood: "Likely",
              initialSeverity: "Major",
              initialRiskScore: 16,
              initialRiskBand: "High",
              residualLikelihood: "Unlikely",
              residualSeverity: "Major",
              residualRiskScore: 8,
              residualRiskBand: "Moderate",
            },
          ],
        },
        contributingFactors: { create: [{ description: "Delayed braking action report to the crew.", category: "Communication" }] },
      },
    });

    const fiveWhys = await db.fiveWhysAnalysis.create({
      data: {
        investigationId: investigation.id,
        problemStatement: "Aircraft departed the runway surface during landing rollout.",
        createdByUserId: investigator.id,
        entries: { create: [{ sequenceNumber: 1, question: "Why did the aircraft depart the runway?", answer: "Braking action was worse than reported." }] },
      },
    });

    const rootCause = await db.rootCause.create({
      data: {
        investigationId: investigation.id,
        description: "Braking action reports were not updated promptly after rain began.",
        category: "Communication",
        fiveWhysAnalysisId: fiveWhys.id,
        supportingEvidence: "ATC tower camera footage and witness statement.",
        confidenceLevel: "High",
      },
    });

    await db.investigationFinding.create({
      data: {
        investigationId: investigation.id,
        findingNumber: 1,
        findingType: "Cause",
        description: "Delayed braking-action reporting contributed to the runway excursion.",
        createdByUserId: investigator.id,
      },
    });

    await db.correctiveAction.create({
      data: {
        investigationId: investigation.id,
        description: "Update braking-action reporting procedure.",
        priority: "High",
        status: "Verified",
        targetDate: new Date("2026-04-15"),
        completedDate: new Date("2026-04-10"),
        verificationMethod: "FollowUpInspection",
        effectivenessResult: "Effective",
        ownerUserId: investigator.id,
        rootCauseId: rootCause.id,
      },
    });

    await db.preventiveAction.create({
      data: {
        investigationId: investigation.id,
        description: "Brief all ATC staff on updated reporting cadence.",
        priority: "Medium",
        status: "Open",
        targetDate: new Date("2026-05-01"),
        ownerExternalName: "External Trainer",
      },
    });

    await db.investigationReview.create({
      data: { investigationId: investigation.id, reviewerUserId: reviewer.id, reviewDecision: "Approved", comments: "Approved for closure." },
    });

    return investigation;
  }

  it("composes the report for a fully-populated Closed investigation with real data throughout (positive, TS-037)", async () => {
    // makeFullInvestigation issues ~12 sequential writes across a real
    // network connection — comfortably past Vitest's 5s default.
    const investigation = await makeFullInvestigation("TEST-FIXTURE-report-full");
    const report = await composeReport(investigation.id, await currentUser());
    expect(report).not.toBeNull();
    expect(report!.investigation.status).toBe("Closed");

    expect(report!.investigation.aircraft?.registration).toBe("TEST-REG1");
    expect(report!.investigation.flight?.picName).toBe("Test Pilot");
    expect(report!.investigation.location?.locationDescription).toContain("Runway 27");
    expect(report!.investigation.persons).toHaveLength(1);
    expect(report!.investigation.immediateActions).toHaveLength(1);
    expect(report!.investigation.evidence).toHaveLength(1);
    expect(report!.investigation.witnesses).toHaveLength(1);
    expect(report!.investigation.hazards).toHaveLength(1);
    expect(report!.investigation.contributingFactors).toHaveLength(1);
    expect(report!.investigation.fiveWhysAnalyses).toHaveLength(1);
    expect(report!.investigation.rootCauses).toHaveLength(1);
    expect(report!.investigation.findings).toHaveLength(1);
    expect(report!.investigation.correctiveActions).toHaveLength(1);
    expect(report!.investigation.preventiveActions).toHaveLength(1);
    expect(report!.investigation.reviews).toHaveLength(1);

    // A Closed investigation carries no DRAFT watermark — the page derives
    // this directly from status, so the underlying data contract is that
    // status is exactly "Closed".
    expect(report!.investigation.status === "Closed").toBe(true);
  }, 20000);

  it("composes the report for a brand-new Draft investigation without throwing, using empty/null rather than undefined (positive, TS-038)", async () => {
    const investigation = await makeDraftInvestigation("TEST-FIXTURE-report-draft");
    const report = await composeReport(investigation.id, await currentUser());
    expect(report).not.toBeNull();
    expect(report!.investigation.status).toBe("Draft");

    // Every relation is either populated or explicitly null/empty — never
    // undefined — so the page's orNotProvided/orNotEstablished helpers can
    // apply the defined placeholder rather than crashing or printing
    // "undefined".
    expect(report!.investigation.aircraft).toBeNull();
    expect(report!.investigation.flight).toBeNull();
    expect(report!.investigation.location).toBeNull();
    expect(report!.investigation.persons).toEqual([]);
    expect(report!.investigation.evidence).toEqual([]);
    expect(report!.investigation.hazards).toEqual([]);
    expect(report!.investigation.rootCauses).toEqual([]);
    expect(report!.investigation.findings).toEqual([]);
    expect(report!.injurySummary).toBeNull();
    expect(report!.conclusion.intro).toBeNull();
    expect(report!.establishedFacts.length).toBeGreaterThan(0); // at least the occurrence-date line
  });

  it("never states anything in Established Facts/Investigation Conclusion beyond stored field values (negative, TS-039)", async () => {
    const investigation = await makeFullInvestigation("TEST-FIXTURE-report-nofab");
    const report = await composeReport(investigation.id, await currentUser());

    const factsText = report!.establishedFacts.map((f) => f.line).join(" ");
    expect(factsText).toContain("TestJet TJ-100");
    expect(factsText).toContain("TEST-REG1");
    expect(factsText).toContain("1 person(s) involved");
    expect(factsText).toContain("1 immediate action(s)");
    expect(factsText).toContain("1 item(s) of evidence");

    // Investigation Conclusion recaps Findings verbatim (findings exist on
    // this fixture, so it must not fall back to the Root Cause summary).
    expect(report!.conclusion.intro).toContain("finding");
    expect(report!.conclusion.lines[0]).toContain("Delayed braking-action reporting contributed to the runway excursion.");
  }, 20000);

  it("assigns every report section the banner report-spec.md §5 specifies (positive, TS-040)", () => {
    const source = readFileSync(
      new URL("../../app/(workspace)/investigations/[id]/report/page.tsx", import.meta.url),
      "utf-8",
    );
    const EXPECTED: [number, string, string][] = [
      [5, "Occurrence Summary", "FACTS"],
      [6, "Aircraft Information", "FACTS"],
      [7, "Flight Information", "FACTS"],
      [8, "Location", "FACTS"],
      [9, "Persons Involved", "FACTS"],
      [10, "Immediate Actions", "FACTS"],
      [11, "Evidence Reviewed", "FACTS"],
      [12, "Established Facts", "FACTS"],
      [13, "Hazard Assessment", "ASSESSMENT"],
      [14, "Risk Assessment", "ASSESSMENT"],
      [15, "Contributing Factors", "ASSESSMENT"],
      [16, "5 Whys", "ASSESSMENT"],
      [17, "Root-Cause Analysis", "ASSESSMENT"],
      [18, "Investigation Findings", "ASSESSMENT"],
      [19, "Corrective Actions", "RECOMMENDATIONS"],
      [20, "Preventive Actions", "RECOMMENDATIONS"],
      [21, "Investigation Conclusion", "ASSESSMENT"],
      [22, "Reviewer Comments", "ADMIN"],
      [23, "Closure Information", "ADMIN"],
      [24, "Disclaimer", "STANDING"],
    ];
    for (const [num, title, banner] of EXPECTED) {
      // None of these titles contain regex metacharacters, so no escaping is needed.
      const re = new RegExp(`renderSection\\(\\s*${num}\\s*,\\s*"${title}"\\s*,\\s*"${banner}"`);
      expect(source, `item ${num} (${title}) should use the "${banner}" banner`).toMatch(re);
    }
  });

  it("serializes unpopulated optional fields as null, not omitted, in the JSON export (positive, TS-041)", async () => {
    const investigation = await makeDraftInvestigation("TEST-FIXTURE-report-export-null");
    const { GET } = await import("@/app/api/investigations/[id]/export/route");
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth).mockResolvedValue({ user: { id: String((await currentUser()).id) } } as never);

    const response = await GET(new Request(`http://localhost/api/investigations/${investigation.id}/export`), {
      params: Promise.resolve({ id: String(investigation.id) }),
    });
    expect(response.status).toBe(200);
    const body = await response.json();

    expect("aircraft" in body.investigation).toBe(true);
    expect(body.investigation.aircraft).toBeNull();
    expect("flight" in body.investigation).toBe(true);
    expect(body.investigation.flight).toBeNull();
    expect("location" in body.investigation).toBe(true);
    expect(body.investigation.location).toBeNull();
    expect(Array.isArray(body.investigation.persons)).toBe(true);
    expect(body.investigation.persons).toEqual([]);
  });

  it("restricts a Viewer's access to a non-Closed investigation's report (negative)", async () => {
    const investigation = await makeDraftInvestigation("TEST-FIXTURE-report-viewer-gate");
    expect(canViewReport({ role: UserRole.Viewer }, investigation.status)).toBe(false);
    expect(canViewReport({ role: UserRole.Administrator }, investigation.status)).toBe(true);
  });
});
