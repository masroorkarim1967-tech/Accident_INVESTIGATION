import { describe, expect, it } from "vitest";
import { witnessSchema } from "@/lib/validation/witness";
import { evidenceSchema, isAllowedAttachmentMimeType, sanitizeFileName } from "@/lib/validation/evidence";

describe("witnessSchema (FR-019)", () => {
  it("accepts a valid witness", () => {
    const result = witnessSchema.safeParse({
      name: "Jane Doe",
      contactInfo: "",
      witnessType: "Crew",
      statementSummary: "Observed the aircraft depart the runway centerline.",
      statementDate: "2026-03-15",
      reliabilityAssessment: "High",
      reliabilityNotes: "",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a statement summary shorter than 10 characters", () => {
    const result = witnessSchema.safeParse({
      name: "Jane Doe",
      witnessType: "Crew",
      statementSummary: "Too short",
      reliabilityAssessment: "High",
    });
    expect(result.success).toBe(false);
  });

  it("accepts 'Unknown / Unidentified' as a valid name (data-model.md §3.8)", () => {
    const result = witnessSchema.safeParse({
      name: "Unknown / Unidentified",
      witnessType: "GroundObserver",
      statementSummary: "Radio call describing the event, caller not identified.",
      reliabilityAssessment: "Low",
    });
    expect(result.success).toBe(true);
  });
});

describe("evidenceSchema (FR-021)", () => {
  it("accepts a valid evidence item", () => {
    const result = evidenceSchema.safeParse({
      evidenceType: "Photographs",
      description: "Photos of the gear scrape marks.",
      source: "Airport Operations",
      relevance: "High",
      reliabilityAssessment: "High",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a Date Obtained in the future", () => {
    const future = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    const result = evidenceSchema.safeParse({
      evidenceType: "Documents",
      description: "Maintenance log excerpt.",
      source: "Maintenance",
      dateObtained: future,
      relevance: "Medium",
      reliabilityAssessment: "Medium",
    });
    expect(result.success).toBe(false);
  });

  it("accepts a Date Obtained of today (boundary)", () => {
    const today = new Date().toISOString().slice(0, 10);
    const result = evidenceSchema.safeParse({
      evidenceType: "Documents",
      description: "Maintenance log excerpt.",
      source: "Maintenance",
      dateObtained: today,
      relevance: "Medium",
      reliabilityAssessment: "Medium",
    });
    expect(result.success).toBe(true);
  });
});

describe("isAllowedAttachmentMimeType (FR-023 / security-spec.md §13)", () => {
  it.each(["image/jpeg", "image/png", "application/pdf", "text/plain"])("allows %s", (mime) => {
    expect(isAllowedAttachmentMimeType(mime)).toBe(true);
  });

  it.each(["video/mp4", "audio/mpeg", "application/msword", "application/x-msdownload", "message/rfc822"])(
    "rejects %s",
    (mime) => {
      expect(isAllowedAttachmentMimeType(mime)).toBe(false);
    },
  );
});

describe("sanitizeFileName", () => {
  it("strips a directory component (path traversal defense)", () => {
    expect(sanitizeFileName("../../etc/passwd")).toBe("passwd");
    expect(sanitizeFileName("C:\\Windows\\System32\\evil.exe")).toBe("evil.exe");
  });

  it("replaces disallowed characters", () => {
    expect(sanitizeFileName("report (final)!.pdf")).toBe("report__final__.pdf");
  });

  it("falls back to a default name if nothing survives sanitization", () => {
    expect(sanitizeFileName("///")).toBe("file");
  });
});
