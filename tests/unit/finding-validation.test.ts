import { describe, expect, it } from "vitest";
import { findingSchema } from "@/lib/validation/finding";

describe("findingSchema (FR-072)", () => {
  it("accepts a valid finding with no citations", () => {
    const result = findingSchema.safeParse({
      findingType: "Cause",
      description: "The primary cause was a checklist step skipped under time pressure.",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a description under 20 characters", () => {
    const result = findingSchema.safeParse({ findingType: "Cause", description: "Too short" });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid findingType", () => {
    const result = findingSchema.safeParse({
      findingType: "NotReal",
      description: "A description that is definitely long enough.",
    });
    expect(result.success).toBe(false);
  });

  it("accepts citation id arrays", () => {
    const result = findingSchema.safeParse({
      findingType: "RiskObservation",
      description: "A description that is definitely long enough.",
      hazardIds: [1, 2],
      contributingFactorIds: [3],
      rootCauseIds: [],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.hazardIds).toEqual([1, 2]);
    }
  });
});
