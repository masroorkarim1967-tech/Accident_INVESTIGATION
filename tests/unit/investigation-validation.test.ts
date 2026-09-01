import { describe, expect, it } from "vitest";
import { assignInvestigatorSchema, createInvestigationSchema } from "@/lib/validation/investigation";

describe("createInvestigationSchema (FR-005) — testing-spec.md TS-001-006 style unit tests", () => {
  it("accepts a valid submission", () => {
    const result = createInvestigationSchema.safeParse({
      title: "Ramp vehicle contact with parked aircraft",
      occurrenceDate: "2026-01-15",
      reporterName: "A. Whitfield",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty title", () => {
    const result = createInvestigationSchema.safeParse({
      title: "",
      occurrenceDate: "2026-01-15",
      reporterName: "A. Whitfield",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a title over 200 characters", () => {
    const result = createInvestigationSchema.safeParse({
      title: "x".repeat(201),
      occurrenceDate: "2026-01-15",
      reporterName: "A. Whitfield",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a malformed date string (EC-04)", () => {
    const result = createInvestigationSchema.safeParse({
      title: "Valid title",
      occurrenceDate: "not-a-date",
      reporterName: "A. Whitfield",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a future occurrence date (EC-05)", () => {
    const future = new Date();
    future.setFullYear(future.getFullYear() + 1);
    const result = createInvestigationSchema.safeParse({
      title: "Valid title",
      occurrenceDate: future.toISOString().slice(0, 10),
      reporterName: "A. Whitfield",
    });
    expect(result.success).toBe(false);
  });

  it("accepts today's date (boundary case, not 'in the future')", () => {
    const result = createInvestigationSchema.safeParse({
      title: "Valid title",
      occurrenceDate: new Date().toISOString().slice(0, 10),
      reporterName: "A. Whitfield",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty reporter name (spec-review.md SR-012 resolution — free text is required)", () => {
    const result = createInvestigationSchema.safeParse({
      title: "Valid title",
      occurrenceDate: "2026-01-15",
      reporterName: "",
    });
    expect(result.success).toBe(false);
  });
});

describe("assignInvestigatorSchema (FR-006)", () => {
  it("accepts valid positive integer IDs, coercing string form-data values", () => {
    const result = assignInvestigatorSchema.safeParse({
      investigationId: "42",
      investigatorUserId: "7",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a non-numeric investigatorUserId", () => {
    const result = assignInvestigatorSchema.safeParse({
      investigationId: "42",
      investigatorUserId: "not-a-number",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a zero or negative ID", () => {
    const result = assignInvestigatorSchema.safeParse({
      investigationId: "0",
      investigatorUserId: "7",
    });
    expect(result.success).toBe(false);
  });
});
