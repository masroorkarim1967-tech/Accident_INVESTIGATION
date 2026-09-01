import { describe, expect, it } from "vitest";
import { correctiveActionSchema, completeActionSchema, verifyActionSchema, reassignActionOwnerSchema } from "@/lib/validation/correctiveAction";
import { preventiveActionSchema } from "@/lib/validation/preventiveAction";

describe("correctiveActionSchema (FR-040)", () => {
  const base = {
    description: "Replace the worn brake assembly.",
    priority: "High",
    targetDate: "2026-12-01",
    requiredForClosure: true,
  };

  it("accepts a valid action with a registered owner", () => {
    expect(correctiveActionSchema.safeParse({ ...base, ownerUserId: 3 }).success).toBe(true);
  });

  it("accepts a valid action with an external owner name", () => {
    expect(correctiveActionSchema.safeParse({ ...base, ownerExternalName: "Jane Contractor" }).success).toBe(true);
  });

  it("rejects both a registered owner and an external name set together", () => {
    expect(correctiveActionSchema.safeParse({ ...base, ownerUserId: 3, ownerExternalName: "Jane" }).success).toBe(false);
  });

  it("rejects neither owner field set", () => {
    expect(correctiveActionSchema.safeParse(base).success).toBe(false);
  });

  it("rejects an empty description", () => {
    expect(correctiveActionSchema.safeParse({ ...base, description: "", ownerUserId: 3 }).success).toBe(false);
  });

  it("rejects an invalid priority", () => {
    expect(correctiveActionSchema.safeParse({ ...base, priority: "Urgent", ownerUserId: 3 }).success).toBe(false);
  });
});

describe("preventiveActionSchema (FR-042) — identical shape to FR-040", () => {
  it("accepts a valid action", () => {
    const result = preventiveActionSchema.safeParse({
      description: "Roll out updated ground-handling training.",
      priority: "Medium",
      targetDate: "2026-12-01",
      requiredForClosure: false,
      ownerUserId: 5,
    });
    expect(result.success).toBe(true);
  });

  it("rejects mutually-exclusive owner fields the same way as CorrectiveAction", () => {
    const result = preventiveActionSchema.safeParse({
      description: "A preventive action.",
      priority: "Low",
      targetDate: "2026-12-01",
      requiredForClosure: false,
    });
    expect(result.success).toBe(false);
  });
});

describe("completeActionSchema (FR-045a)", () => {
  it("rejects a future Completion Date", () => {
    const future = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    expect(completeActionSchema.safeParse({ completedDate: future }).success).toBe(false);
  });

  it("accepts today's date", () => {
    const today = new Date().toISOString().slice(0, 10);
    expect(completeActionSchema.safeParse({ completedDate: today }).success).toBe(true);
  });
});

describe("verifyActionSchema (FR-045b)", () => {
  it("requires both Verification Method and Effectiveness Result", () => {
    expect(verifyActionSchema.safeParse({ verificationMethod: "Audit" }).success).toBe(false);
    expect(verifyActionSchema.safeParse({ effectivenessResult: "Effective" }).success).toBe(false);
    expect(verifyActionSchema.safeParse({ verificationMethod: "Audit", effectivenessResult: "Effective" }).success).toBe(true);
  });
});

describe("reassignActionOwnerSchema (FR-047)", () => {
  it("enforces the same mutual-exclusivity rule as the main action schema", () => {
    expect(reassignActionOwnerSchema.safeParse({ ownerUserId: 1, ownerExternalName: "X" }).success).toBe(false);
    expect(reassignActionOwnerSchema.safeParse({ ownerUserId: 1 }).success).toBe(true);
    expect(reassignActionOwnerSchema.safeParse({ ownerExternalName: "X" }).success).toBe(true);
    expect(reassignActionOwnerSchema.safeParse({}).success).toBe(false);
  });
});
