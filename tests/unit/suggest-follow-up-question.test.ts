import { describe, expect, it } from "vitest";
import { suggestFollowUpQuestion } from "@/lib/services/suggestFollowUpQuestion";

describe("suggestFollowUpQuestion (FR-036)", () => {
  it("templates a passive-voice answer into a matching question (FR-036's own worked example)", () => {
    const result = suggestFollowUpQuestion("the checklist step was skipped");
    expect(result.question).toBe("Why was the checklist step skipped?");
    expect(result.confidence).toBe("High");
  });

  it("handles a plural passive-voice answer with 'were'", () => {
    const result = suggestFollowUpQuestion("the maintenance records were not updated");
    expect(result.question).toBe("Why were the maintenance records not updated?");
    expect(result.confidence).toBe("High");
  });

  it("falls back to a generic question for a non-passive answer, at Low confidence", () => {
    const result = suggestFollowUpQuestion("the technician forgot to sign the form");
    expect(result.question).toMatch(/^Why did /);
    expect(result.confidence).toBe("Low");
  });

  it("returns the generic fallback for an answer too short to template meaningfully", () => {
    const result = suggestFollowUpQuestion("unclear");
    expect(result).toEqual({ question: "Why did this happen?", confidence: "Low" });
  });

  it("returns the generic fallback for an empty answer", () => {
    const result = suggestFollowUpQuestion("   ");
    expect(result).toEqual({ question: "Why did this happen?", confidence: "Low" });
  });

  it("strips trailing punctuation before templating", () => {
    const result = suggestFollowUpQuestion("the inspection was deferred.");
    expect(result.question).toBe("Why was the inspection deferred?");
  });
});
