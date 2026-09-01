import { describe, expect, it } from "vitest";
import { suggestContributingFactors } from "@/lib/services/investigationSupportEngine/suggestContributingFactor";

describe("suggestContributingFactors (FR-033)", () => {
  it("returns no suggestions when there are no closed-investigation candidates", () => {
    const result = suggestContributingFactors("The aircraft departed the runway during a heavy rain landing.", []);
    expect(result).toEqual([]);
  });

  it("returns no suggestions when no candidate narrative overlaps meaningfully", () => {
    const result = suggestContributingFactors("The aircraft departed the runway during a heavy rain landing.", [
      {
        referenceNumber: "INC-2025-0001",
        narrativeDescription: "A passenger reported a lost bag at the arrivals carousel.",
        factors: [{ description: "Baggage tag misapplied.", category: "Procedures" }],
      },
    ]);
    expect(result).toEqual([]);
  });

  it("ranks a highly-overlapping candidate above a weakly-overlapping one and tags the source", () => {
    const currentNarrative =
      "The aircraft departed the runway centerline during landing in heavy rain due to degraded braking action.";
    const result = suggestContributingFactors(currentNarrative, [
      {
        referenceNumber: "INC-2025-0010",
        narrativeDescription: "Runway departure during landing in heavy rain, degraded braking action noted.",
        factors: [{ description: "Runway grooving was overdue for maintenance.", category: "Equipment" }],
      },
      {
        referenceNumber: "INC-2025-0020",
        narrativeDescription: "A ground vehicle collided with equipment on the ramp during pushback.",
        factors: [{ description: "Marshaller was not in position.", category: "Supervision" }],
      },
    ]);

    expect(result.length).toBeGreaterThan(0);
    expect(result[0].sourceReferenceNumber).toBe("INC-2025-0010");
    expect(result[0].description).toBe("Runway grooving was overdue for maintenance.");
    expect(["Low", "Medium", "High"]).toContain(result[0].confidence);
  });

  it("excludes a candidate with a strong narrative match but zero recorded factors", () => {
    const currentNarrative = "Heavy rain landing, runway departure, degraded braking action.";
    const result = suggestContributingFactors(currentNarrative, [
      {
        referenceNumber: "INC-2025-0030",
        narrativeDescription: "Heavy rain landing, runway departure, degraded braking action.",
        factors: [],
      },
    ]);
    expect(result).toEqual([]);
  });

  it("deduplicates identical suggestions drawn from multiple source investigations", () => {
    const currentNarrative = "Heavy rain landing, runway departure, degraded braking action, runway grooving overdue.";
    const result = suggestContributingFactors(currentNarrative, [
      {
        referenceNumber: "INC-A",
        narrativeDescription: "Heavy rain landing, runway departure, degraded braking action, runway grooving overdue.",
        factors: [{ description: "Runway grooving was overdue for maintenance.", category: "Equipment" }],
      },
      {
        referenceNumber: "INC-B",
        narrativeDescription: "Heavy rain landing, runway departure, degraded braking action, runway grooving overdue.",
        factors: [{ description: "Runway grooving was overdue for maintenance.", category: "Equipment" }],
      },
    ]);
    const matches = result.filter((s) => s.description === "Runway grooving was overdue for maintenance.");
    expect(matches).toHaveLength(1);
  });
});
