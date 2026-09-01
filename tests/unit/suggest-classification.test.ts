import { describe, expect, it } from "vitest";
import { suggestClassification } from "@/lib/services/investigationSupportEngine/suggestClassification";

describe("suggestClassification (FR-028, TS-032/TS-033 style)", () => {
  it("returns a confident match with matched keywords for a strong signal (TS-032)", () => {
    const result = suggestClassification(
      "The aircraft experienced a runway excursion after it veered off the runway during landing rollout in wet conditions.",
    );
    expect(result).not.toBeNull();
    expect(result?.category).toBe("AircraftIncident");
    expect(result?.subcategory).toBe("Runway Excursion");
    expect(result?.matchedKeywords).toContain("runway excursion");
    expect(result?.matchedKeywords).toContain("veered off the runway");
    expect(result?.confidence).toBe("High");
  });

  it("returns Low/Medium confidence for a single, less specific keyword match", () => {
    const result = suggestClassification("Pushback proceeded normally with no reported issues afterward.");
    expect(result?.subcategory).toBe("Pushback/Towing Incident");
    expect(result?.confidence).toBe("Low");
  });

  it("returns null (never a low-confidence guess) when no rule matches (TS-033)", () => {
    const result = suggestClassification("A completely unremarkable narrative with no relevant terms at all.");
    expect(result).toBeNull();
  });

  it("is case-insensitive", () => {
    const result = suggestClassification("BIRD STRIKE reported on departure.");
    expect(result?.subcategory).toBe("Bird/Wildlife Strike");
  });

  it("picks the rule with the most matched keywords when several match", () => {
    const result = suggestClassification(
      "Ground vehicle collision involving ground support equipment; gse malfunction suspected.",
    );
    // Both "Ground Vehicle Collision" and "GSE Malfunction" rules can match;
    // the one with more matched keywords in this narrative should win.
    expect(result).not.toBeNull();
    expect(result?.category).toBe("EquipmentVehicleIncident");
  });
});
