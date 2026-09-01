import { describe, expect, it } from "vitest";
import { hazardSchema, hazardResidualRiskSchema } from "@/lib/validation/hazard";
import {
  riskBandRowSchema,
  findCoverageViolation,
  findDuplicateActiveLabel,
} from "@/lib/validation/riskBandConfiguration";

describe("hazardSchema (FR-029)", () => {
  it("accepts a valid hazard", () => {
    const result = hazardSchema.safeParse({
      description: "Wet runway with degraded braking action.",
      hazardCategory: "Environmental",
      initialLikelihood: "Likely",
      initialSeverity: "Major",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty description", () => {
    const result = hazardSchema.safeParse({
      description: "",
      hazardCategory: "Environmental",
      initialLikelihood: "Likely",
      initialSeverity: "Major",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid hazardCategory", () => {
    const result = hazardSchema.safeParse({
      description: "A hazard.",
      hazardCategory: "NotARealCategory",
      initialLikelihood: "Likely",
      initialSeverity: "Major",
    });
    expect(result.success).toBe(false);
  });
});

describe("hazardResidualRiskSchema (FR-068)", () => {
  it("accepts both residual fields set together", () => {
    const result = hazardResidualRiskSchema.safeParse({
      existingControls: "Daylight-only patrols.",
      residualLikelihood: "Possible",
      residualSeverity: "Moderate",
    });
    expect(result.success).toBe(true);
  });

  it("accepts neither residual field set (not required at hazard creation)", () => {
    const result = hazardResidualRiskSchema.safeParse({
      existingControls: "",
      residualLikelihood: "",
      residualSeverity: "",
    });
    expect(result.success).toBe(true);
  });

  it("rejects residual likelihood set without residual severity", () => {
    const result = hazardResidualRiskSchema.safeParse({
      existingControls: "",
      residualLikelihood: "Possible",
      residualSeverity: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects residual severity set without residual likelihood", () => {
    const result = hazardResidualRiskSchema.safeParse({
      existingControls: "",
      residualLikelihood: "",
      residualSeverity: "Moderate",
    });
    expect(result.success).toBe(false);
  });

  it("allows existing controls to be recorded with no risk reduction (data-model.md §10 worked example)", () => {
    const result = hazardResidualRiskSchema.safeParse({
      existingControls: "Daylight-only patrols do not address a dusk-hours hazard.",
      residualLikelihood: "Likely",
      residualSeverity: "Major",
    });
    expect(result.success).toBe(true);
  });
});

describe("riskBandRowSchema (FR-069)", () => {
  it("rejects a row where minScore > maxScore", () => {
    const result = riskBandRowSchema.safeParse({
      minScore: 10,
      maxScore: 5,
      bandLabel: "Bad",
      displayOrder: 0,
      isActive: true,
    });
    expect(result.success).toBe(false);
  });

  it("accepts a valid row", () => {
    const result = riskBandRowSchema.safeParse({
      minScore: 1,
      maxScore: 4,
      bandLabel: "Low",
      colorHint: "green",
      displayOrder: 0,
      isActive: true,
    });
    expect(result.success).toBe(true);
  });
});

describe("findCoverageViolation (data-model.md §6.4 integrity rule)", () => {
  const DEFAULT_BANDS = [
    { minScore: 1, maxScore: 4, isActive: true },
    { minScore: 5, maxScore: 9, isActive: true },
    { minScore: 10, maxScore: 16, isActive: true },
    { minScore: 17, maxScore: 25, isActive: true },
  ];

  it("accepts the seeded default 4-band configuration (no gaps, no overlaps)", () => {
    expect(findCoverageViolation(DEFAULT_BANDS)).toBeNull();
  });

  it("detects a gap at the start (minScore does not start at 1)", () => {
    const bands = [{ minScore: 2, maxScore: 25, isActive: true }];
    expect(findCoverageViolation(bands)).toMatch(/Gap/);
  });

  it("detects a gap at the end (maxScore does not reach 25)", () => {
    const bands = [{ minScore: 1, maxScore: 20, isActive: true }];
    expect(findCoverageViolation(bands)).toMatch(/Gap/);
  });

  it("detects a gap in the middle", () => {
    const bands = [
      { minScore: 1, maxScore: 4, isActive: true },
      { minScore: 6, maxScore: 25, isActive: true },
    ];
    expect(findCoverageViolation(bands)).toMatch(/Gap/);
  });

  it("detects an overlap between two active bands", () => {
    const bands = [
      { minScore: 1, maxScore: 10, isActive: true },
      { minScore: 8, maxScore: 25, isActive: true },
    ];
    expect(findCoverageViolation(bands)).toMatch(/Overlap/);
  });

  it("ignores inactive rows entirely, even if they would overlap an active one", () => {
    const bands = [...DEFAULT_BANDS, { minScore: 1, maxScore: 25, isActive: false }];
    expect(findCoverageViolation(bands)).toBeNull();
  });

  it("requires at least one active band", () => {
    const bands = [{ minScore: 1, maxScore: 25, isActive: false }];
    expect(findCoverageViolation(bands)).not.toBeNull();
  });
});

describe("findDuplicateActiveLabel (FR-069)", () => {
  it("detects two active rows sharing a Band Label", () => {
    const rows = [
      { bandLabel: "Low", isActive: true },
      { bandLabel: "Low", isActive: true },
    ];
    expect(findDuplicateActiveLabel(rows)).not.toBeNull();
  });

  it("allows the same label on an active row and an inactive row", () => {
    const rows = [
      { bandLabel: "Low", isActive: true },
      { bandLabel: "Low", isActive: false },
    ];
    expect(findDuplicateActiveLabel(rows)).toBeNull();
  });

  it("allows all-distinct labels", () => {
    const rows = [
      { bandLabel: "Low", isActive: true },
      { bandLabel: "High", isActive: true },
    ];
    expect(findDuplicateActiveLabel(rows)).toBeNull();
  });
});
