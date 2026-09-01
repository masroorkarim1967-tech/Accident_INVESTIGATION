import { describe, expect, it } from "vitest";
import { contributingFactorSchema } from "@/lib/validation/contributingFactor";
import { fiveWhysAnalysisSchema, fiveWhysEntrySchema } from "@/lib/validation/fiveWhys";
import { rootCauseSchema } from "@/lib/validation/rootCause";

describe("contributingFactorSchema (FR-031)", () => {
  it("accepts a valid factor with no hazard links", () => {
    const result = contributingFactorSchema.safeParse({
      description: "Checklist step was not followed.",
      category: "Procedures",
      hazardIds: [],
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty description", () => {
    const result = contributingFactorSchema.safeParse({ description: "", category: "Procedures", hazardIds: [] });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid category", () => {
    const result = contributingFactorSchema.safeParse({ description: "A factor.", category: "NotReal", hazardIds: [] });
    expect(result.success).toBe(false);
  });
});

describe("fiveWhysAnalysisSchema (FR-034)", () => {
  it("rejects a problem statement under 10 characters", () => {
    const result = fiveWhysAnalysisSchema.safeParse({ problemStatement: "Too short" });
    expect(result.success).toBe(false);
  });

  it("accepts a valid problem statement", () => {
    const result = fiveWhysAnalysisSchema.safeParse({ problemStatement: "The aircraft departed the runway centerline." });
    expect(result.success).toBe(true);
  });
});

describe("fiveWhysEntrySchema (FR-035)", () => {
  it("requires both question and answer", () => {
    expect(fiveWhysEntrySchema.safeParse({ question: "", answer: "Because X" }).success).toBe(false);
    expect(fiveWhysEntrySchema.safeParse({ question: "Why did X happen?", answer: "" }).success).toBe(false);
    expect(fiveWhysEntrySchema.safeParse({ question: "Why did X happen?", answer: "Because X" }).success).toBe(true);
  });
});

describe("rootCauseSchema (FR-038)", () => {
  it("accepts a complete normal (non-inconclusive) root cause", () => {
    const result = rootCauseSchema.safeParse({
      isInconclusive: false,
      description: "Checklist step was skipped under time pressure.",
      category: "Procedures",
      supportingEvidence: "Maintenance log entry #4 confirms the step was not signed off.",
      confidenceLevel: "High",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a normal root cause missing description/category/supportingEvidence/confidenceLevel", () => {
    const result = rootCauseSchema.safeParse({ isInconclusive: false });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path[0]);
      expect(paths).toEqual(expect.arrayContaining(["description", "category", "supportingEvidence", "confidenceLevel"]));
    }
  });

  it("rejects supportingEvidence under 10 characters", () => {
    const result = rootCauseSchema.safeParse({
      isInconclusive: false,
      description: "A cause.",
      category: "Procedures",
      supportingEvidence: "Too short",
      confidenceLevel: "Low",
    });
    expect(result.success).toBe(false);
  });

  it("an explicit 'no direct supporting evidence identified yet' value is accepted (still 10+ chars)", () => {
    const result = rootCauseSchema.safeParse({
      isInconclusive: false,
      description: "A cause.",
      category: "Procedures",
      supportingEvidence: "No direct supporting evidence identified yet.",
      confidenceLevel: "Low",
    });
    expect(result.success).toBe(true);
  });

  it("accepts an inconclusive override with none of the four normal fields set", () => {
    const result = rootCauseSchema.safeParse({
      isInconclusive: true,
      inconclusiveJustification: "Available evidence was insufficient to pinpoint a definitive cause.",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an inconclusive override with a justification under 20 characters", () => {
    const result = rootCauseSchema.safeParse({ isInconclusive: true, inconclusiveJustification: "Too short" });
    expect(result.success).toBe(false);
  });

  it("rejects an inconclusive override with no justification at all", () => {
    const result = rootCauseSchema.safeParse({ isInconclusive: true });
    expect(result.success).toBe(false);
  });
});
