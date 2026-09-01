import { z } from "zod";
import { EvidenceType, AssessmentLevel } from "@/prisma/generated/prisma/client";

/** FR-021 — Add/Edit Evidence Item. Date Obtained, if set, cannot be in the future. */
export const evidenceSchema = z.object({
  evidenceType: z.nativeEnum(EvidenceType),
  description: z.string().trim().min(1, "Description is required."),
  source: z.string().trim().min(1, "Source is required.").max(200),
  collectedBy: z.string().trim().max(150).optional().or(z.literal("")),
  dateObtained: z
    .string()
    .optional()
    .or(z.literal(""))
    .refine((v) => !v || !Number.isNaN(Date.parse(v)), "Enter a valid date.")
    .refine((v) => !v || new Date(v).getTime() <= Date.now(), "Date Obtained cannot be in the future."),
  relevance: z.nativeEnum(AssessmentLevel),
  reliabilityAssessment: z.nativeEnum(AssessmentLevel),
  reliabilityNotes: z.string().trim().max(5000).optional().or(z.literal("")),
  investigatorNotes: z.string().trim().max(5000).optional().or(z.literal("")),
  custodyNotes: z.string().trim().max(5000).optional().or(z.literal("")),
});

/**
 * FR-023 / security-spec.md §13 — file upload validation. Allowlist, not
 * blocklist: images (JPEG/PNG), PDF, and plain text only — deliberately
 * excluding video/audio, macro-capable office formats, and executables.
 * Checked server-side (authoritative, NFR-4.5) even though the uploader
 * also pre-checks client-side for immediate feedback.
 */
export const ALLOWED_ATTACHMENT_MIME_TYPES = ["image/jpeg", "image/png", "application/pdf", "text/plain"] as const;
export const MAX_ATTACHMENT_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB per file
export const MAX_INVESTIGATION_ATTACHMENT_TOTAL_BYTES = 100 * 1024 * 1024; // 100MB per investigation

export function isAllowedAttachmentMimeType(mimeType: string): boolean {
  return (ALLOWED_ATTACHMENT_MIME_TYPES as readonly string[]).includes(mimeType);
}

/**
 * Sanitizes an original filename for display/storage — strips any
 * directory component and disallowed characters. The actual storage
 * handle (`storagePath`) is always server-generated (a UUID), never
 * derived from this value, so this sanitization is a display-safety
 * measure, not a security boundary by itself.
 */
export function sanitizeFileName(original: string): string {
  const base = original.split(/[/\\]/).pop() ?? "file";
  const cleaned = base.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 255);
  return cleaned || "file";
}
