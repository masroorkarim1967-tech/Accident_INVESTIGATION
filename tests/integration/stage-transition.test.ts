import { describe, expect, it, vi, afterAll, beforeEach } from "vitest";
import { db } from "@/lib/db";
import { UserRole } from "@/prisma/generated/prisma/client";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

/**
 * The core end-to-end proof of Phase 10's automatic stage ladder
 * (investigation-workflow.md §6/§8): drives a real fixture investigation
 * through Draft -> Open -> UnderInvestigation -> Analysis using the
 * actual retrofitted Server Actions from Phases 4-9, not a direct call
 * into checkAndAdvanceStage. Confirms each gate only fires once fully
 * satisfied (not early) and that every StageAdvanced InvestigationHistory
 * row is attributed to the real user whose save satisfied it
 * (data-model.md §3.24), not a system pseudo-user.
 */
describe.skipIf(!process.env.DATABASE_URL)("Automatic Stage Transitions (investigation-workflow.md §6/§8)", () => {
  afterAll(async () => {
    await db.investigation.deleteMany({ where: { title: { startsWith: "TEST-FIXTURE-" } } });
    await db.$disconnect();
  });

  async function loginAs(email: string, role: UserRole) {
    const { auth } = await import("@/lib/auth");
    const user = await db.user.findUniqueOrThrow({ where: { email } });
    vi.mocked(auth).mockResolvedValue({ user: { id: String(user.id), role } } as never);
    return user;
  }

  beforeEach(async () => {
    await loginAs("r.okafor@investigations.example", UserRole.Investigator);
  });

  async function status(investigationId: number) {
    return (await db.investigation.findUniqueOrThrow({ where: { id: investigationId } })).status;
  }

  it("advances Draft -> Open only once BOTH Occurrence Details and Investigator assignment are complete", async () => {
    const investigator = await db.user.findUniqueOrThrow({ where: { email: "r.okafor@investigations.example" } });
    const investigation = await db.investigation.create({
      data: {
        referenceNumber: `INC-TEST-${Math.random().toString(36).slice(2, 10)}`,
        title: "TEST-FIXTURE-stage-draft-to-open",
        status: "Draft",
        reporterName: "Test Reporter",
        createdByUserId: investigator.id,
        occurrence: { create: { occurrenceDateUtc: new Date("2026-03-15") } },
      },
    });
    expect(await status(investigation.id)).toBe("Draft");

    // Narrative alone (no investigator assigned yet) must NOT advance the stage.
    const { saveOccurrenceNarrativeAction } = await import("@/lib/actions/occurrence");
    const narrativeFormData = new FormData();
    narrativeFormData.set("occurrenceDate", "2026-03-15");
    narrativeFormData.set("occurrenceTimeUtc", "12:00");
    narrativeFormData.set("occurrenceTimeLocal", "");
    narrativeFormData.set("phaseOfFlight", "Cruise");
    narrativeFormData.set("briefDescription", "Brief description of the occurrence.");
    narrativeFormData.set("narrativeDescription", "A sufficiently long narrative description of what happened during the flight.");
    const narrativeResult = await saveOccurrenceNarrativeAction(investigation.id, { error: null }, narrativeFormData);
    expect(narrativeResult.error).toBeNull();
    expect(await status(investigation.id)).toBe("Draft");

    // Assigning an Investigator now completes the Draft -> Open gate.
    await loginAs("m.delacroix@investigations.example", UserRole.InvestigationManager);
    const manager = await db.user.findUniqueOrThrow({ where: { email: "m.delacroix@investigations.example" } });
    const { assignInvestigatorAction } = await import("@/lib/actions/investigation");
    const assignFormData = new FormData();
    assignFormData.set("investigationId", String(investigation.id));
    assignFormData.set("investigatorUserId", String(investigator.id));
    const assignResult = await assignInvestigatorAction({ error: null }, assignFormData);
    expect(assignResult.error).toBeNull();
    expect(await status(investigation.id)).toBe("Open");

    const historyRow = await db.investigationHistory.findFirstOrThrow({
      where: { investigationId: investigation.id, eventType: "StageAdvanced", toStatus: "Open" },
    });
    expect(historyRow.fromStatus).toBe("Draft");
    expect(historyRow.performedByUserId).toBe(manager.id);
  });

  it("advances Open -> UnderInvestigation only once Classification AND Actual/Potential Outcome are complete", async () => {
    const investigator = await db.user.findUniqueOrThrow({ where: { email: "r.okafor@investigations.example" } });
    const investigation = await db.investigation.create({
      data: {
        referenceNumber: `INC-TEST-${Math.random().toString(36).slice(2, 10)}`,
        title: "TEST-FIXTURE-stage-open-to-underinv",
        status: "Open",
        reporterName: "Test Reporter",
        createdByUserId: investigator.id,
        assignedInvestigatorUserId: investigator.id,
        occurrence: { create: { occurrenceDateUtc: new Date("2026-03-15") } },
      },
    });

    const subcategory = await db.occurrenceSubcategoryOption.findFirstOrThrow({ where: { category: "AircraftIncident" } });
    const { saveOccurrenceClassificationAction, saveOccurrenceOutcomeAction } = await import("@/lib/actions/occurrence");

    const classificationFormData = new FormData();
    classificationFormData.set("occurrenceCategory", "AircraftIncident");
    classificationFormData.set("occurrenceSubcategoryId", String(subcategory.id));
    const classificationResult = await saveOccurrenceClassificationAction(investigation.id, false, { error: null }, classificationFormData);
    expect(classificationResult.error).toBeNull();
    expect(await status(investigation.id)).toBe("Open");

    const outcomeFormData = new FormData();
    outcomeFormData.set("actualOutcomeSeverity", "Minor");
    outcomeFormData.set("actualOutcomeDescription", "A minor actual outcome description, long enough.");
    outcomeFormData.set("potentialOutcomeSeverity", "Major");
    outcomeFormData.set("potentialOutcomeDescription", "A more severe potential outcome description, long enough.");
    outcomeFormData.set("likelihoodOfRecurrence", "Possible");
    const outcomeResult = await saveOccurrenceOutcomeAction(investigation.id, { error: null }, outcomeFormData);
    expect(outcomeResult.error).toBeNull();
    expect(await status(investigation.id)).toBe("UnderInvestigation");

    const historyRow = await db.investigationHistory.findFirstOrThrow({
      where: { investigationId: investigation.id, eventType: "StageAdvanced", toStatus: "UnderInvestigation" },
    });
    expect(historyRow.performedByUserId).toBe(investigator.id);
  });

  it("advances UnderInvestigation -> Analysis only once Aircraft/Flight/Location and the Persons/Evidence/Witnesses acknowledgments are all complete", async () => {
    const investigator = await db.user.findUniqueOrThrow({ where: { email: "r.okafor@investigations.example" } });
    const investigation = await db.investigation.create({
      data: {
        referenceNumber: `INC-TEST-${Math.random().toString(36).slice(2, 10)}`,
        title: "TEST-FIXTURE-stage-underinv-to-analysis",
        status: "UnderInvestigation",
        reporterName: "Test Reporter",
        createdByUserId: investigator.id,
        assignedInvestigatorUserId: investigator.id,
        occurrence: { create: { occurrenceDateUtc: new Date("2026-03-15") } },
      },
    });

    const { saveAircraftAction } = await import("@/lib/actions/aircraft");
    const aircraftFormData = new FormData();
    aircraftFormData.set("registration", "N12345");
    aircraftFormData.set("manufacturer", "Boeing");
    aircraftFormData.set("model", "737");
    aircraftFormData.set("serialNumber", "");
    aircraftFormData.set("yearOfManufacture", "");
    aircraftFormData.set("operatorName", "Test Airline");
    aircraftFormData.set("engineType", "");
    aircraftFormData.set("engineCount", "2");
    aircraftFormData.set("damageLevel", "None");
    expect((await saveAircraftAction(investigation.id, { error: null }, aircraftFormData)).error).toBeNull();
    expect(await status(investigation.id)).toBe("UnderInvestigation");

    const { saveFlightAction } = await import("@/lib/actions/flight");
    const flightFormData = new FormData();
    flightFormData.set("flightNumber", "");
    flightFormData.set("flightRules", "IFR");
    flightFormData.set("departureAerodrome", "KJFK");
    flightFormData.set("destinationAerodrome", "KLAX");
    flightFormData.set("alternateAerodrome", "");
    flightFormData.set("picName", "Capt. Test");
    flightFormData.set("picLicenseNumber", "");
    flightFormData.set("crewComplement", "6");
    expect((await saveFlightAction(investigation.id, { error: null }, flightFormData)).error).toBeNull();
    expect(await status(investigation.id)).toBe("UnderInvestigation");

    const { saveLocationAction } = await import("@/lib/actions/location");
    const locationFormData = new FormData();
    locationFormData.set("locationDescription", "En route over open water.");
    locationFormData.set("latitude", "");
    locationFormData.set("longitude", "");
    locationFormData.set("aerodromeCode", "");
    locationFormData.set("weatherVisibility", "");
    locationFormData.set("windSpeedKt", "");
    locationFormData.set("windDirectionDeg", "");
    locationFormData.set("cloudCover", "");
    locationFormData.set("temperatureC", "");
    locationFormData.set("precipitation", "");
    locationFormData.set("runwayInUse", "");
    locationFormData.set("lightingConditions", "Day");
    locationFormData.set("terrainType", "");
    expect((await saveLocationAction(investigation.id, { error: null }, locationFormData)).error).toBeNull();
    expect(await status(investigation.id)).toBe("UnderInvestigation");

    const { toggleNoPersonsInvolvedAction } = await import("@/lib/actions/occurrence");
    expect((await toggleNoPersonsInvolvedAction(investigation.id, true)).error).toBeNull();
    expect(await status(investigation.id)).toBe("UnderInvestigation");

    const { toggleNoEvidenceAvailableAction } = await import("@/lib/actions/evidence");
    expect((await toggleNoEvidenceAvailableAction(investigation.id, true)).error).toBeNull();
    expect(await status(investigation.id)).toBe("UnderInvestigation");

    // The last of the six gate conditions — this save should finally advance the stage.
    const { toggleNoWitnessesAction } = await import("@/lib/actions/witness");
    expect((await toggleNoWitnessesAction(investigation.id, true)).error).toBeNull();
    expect(await status(investigation.id)).toBe("Analysis");

    const historyRow = await db.investigationHistory.findFirstOrThrow({
      where: { investigationId: investigation.id, eventType: "StageAdvanced", toStatus: "Analysis" },
    });
    expect(historyRow.fromStatus).toBe("UnderInvestigation");
    expect(historyRow.performedByUserId).toBe(investigator.id);
  }, 20000); // 7 sequential Server Action round-trips over a real network connection — past Vitest's 5s default.

  it("Analysis never auto-advances to Review — that transition is manual only (FR-049)", async () => {
    const investigator = await db.user.findUniqueOrThrow({ where: { email: "r.okafor@investigations.example" } });
    const investigation = await db.investigation.create({
      data: {
        referenceNumber: `INC-TEST-${Math.random().toString(36).slice(2, 10)}`,
        title: "TEST-FIXTURE-stage-analysis-stays",
        status: "Analysis",
        reporterName: "Test Reporter",
        createdByUserId: investigator.id,
        assignedInvestigatorUserId: investigator.id,
        occurrence: { create: { occurrenceDateUtc: new Date("2026-03-15") } },
      },
    });

    const { checkAndAdvanceStage } = await import("@/lib/services/stageTransition");
    await checkAndAdvanceStage(investigation.id, investigator.id);
    expect(await status(investigation.id)).toBe("Analysis");
  });

  it("never skips a stage — advancing from Draft moves to Open only, even when the NEXT gate is also already satisfied (negative, TS-002)", async () => {
    const investigator = await db.user.findUniqueOrThrow({ where: { email: "r.okafor@investigations.example" } });
    const subcategory = await db.occurrenceSubcategoryOption.findFirstOrThrow({ where: { category: "AircraftIncident" } });

    // Deliberately over-populated: satisfies both Draft->Open's gate AND
    // Open->UnderInvestigation's gate (Classification + Outcome fields) up
    // front, per investigation-workflow.md §7.1's "no forward skipping"
    // rule — a single checkAndAdvanceStage call must still land on exactly
    // Open, never jump straight to UnderInvestigation.
    const investigation = await db.investigation.create({
      data: {
        referenceNumber: `INC-TEST-${Math.random().toString(36).slice(2, 10)}`,
        title: "TEST-FIXTURE-stage-no-skip",
        status: "Draft",
        reporterName: "Test Reporter",
        createdByUserId: investigator.id,
        assignedInvestigatorUserId: investigator.id,
        occurrence: {
          create: {
            occurrenceDateUtc: new Date("2026-03-15"),
            occurrenceTimeUtc: new Date("2026-03-15T12:00:00Z"),
            phaseOfFlight: "Landing",
            briefDescription: "Fixture brief description.",
            narrativeDescription: "Fixture narrative description.",
            occurrenceCategory: "AircraftIncident",
            occurrenceSubcategoryId: subcategory.id,
            actualOutcomeSeverity: "Minor",
            potentialOutcomeSeverity: "Major",
            likelihoodOfRecurrence: "Possible",
          },
        },
      },
    });

    const { checkAndAdvanceStage } = await import("@/lib/services/stageTransition");
    await checkAndAdvanceStage(investigation.id, investigator.id);
    expect(await status(investigation.id)).toBe("Open");

    // Confirms exactly one StageAdvanced event fired (Draft->Open), not two.
    const events = await db.investigationHistory.findMany({ where: { investigationId: investigation.id, eventType: "StageAdvanced" } });
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ fromStatus: "Draft", toStatus: "Open" });
  });
});
