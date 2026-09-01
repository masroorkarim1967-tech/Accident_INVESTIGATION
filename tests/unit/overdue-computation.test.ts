import { describe, expect, it } from "vitest";
import { isOverdue, displayStatus } from "@/lib/services/overdueComputation";

const NOW = new Date("2026-06-15T12:00:00Z");

describe("isOverdue (data-model.md §6.9.2)", () => {
  it("is overdue when targetDate is strictly before today and status is Open/Assigned/InProgress", () => {
    expect(isOverdue(new Date("2026-06-14"), "Open", NOW)).toBe(true);
    expect(isOverdue(new Date("2026-06-14"), "Assigned", NOW)).toBe(true);
    expect(isOverdue(new Date("2026-06-14"), "InProgress", NOW)).toBe(true);
  });

  it("an action due exactly today is NOT yet overdue (strictly < today)", () => {
    expect(isOverdue(new Date("2026-06-15"), "Open", NOW)).toBe(false);
  });

  it("Completed, Verified, and Cancelled are never overdue regardless of date", () => {
    expect(isOverdue(new Date("2020-01-01"), "Completed", NOW)).toBe(false);
    expect(isOverdue(new Date("2020-01-01"), "Verified", NOW)).toBe(false);
    expect(isOverdue(new Date("2020-01-01"), "Cancelled", NOW)).toBe(false);
  });

  it("a future targetDate is never overdue", () => {
    expect(isOverdue(new Date("2026-06-16"), "Open", NOW)).toBe(false);
  });
});

describe("displayStatus", () => {
  it("returns Overdue in place of the stored status when overdue", () => {
    expect(displayStatus(new Date("2026-06-01"), "InProgress", NOW)).toBe("Overdue");
  });

  it("returns the stored status when not overdue", () => {
    expect(displayStatus(new Date("2026-07-01"), "InProgress", NOW)).toBe("InProgress");
    expect(displayStatus(new Date("2020-01-01"), "Verified", NOW)).toBe("Verified");
  });
});
