import { z } from "zod";
import { FactorCategory, ConfidenceLevel } from "@/prisma/generated/prisma/client";

/**
 * FR-038 — Add/Edit Root Cause. Description/Category/Supporting Evidence/
 * Confidence Level are required together UNLESS `isInconclusive` is set
 * (investigation-workflow.md §9.5's override), in which case
 * `inconclusiveJustification` (min 20 chars) is required instead — the
 * same "structurally required together, or use the override" shape as
 * data-model.md §3.17's field table, enforced here rather than by a DB
 * CHECK constraint (Prisma has none for this cross-field condition).
 */
export const rootCauseSchema = z
  .object({
    isInconclusive: z.boolean(),
    description: z.string().trim().max(10000).optional().or(z.literal("")),
    category: z.nativeEnum(FactorCategory).optional().or(z.literal("")),
    supportingEvidence: z.string().trim().max(10000).optional().or(z.literal("")),
    investigatorNotes: z.string().trim().max(10000).optional().or(z.literal("")),
    confidenceLevel: z.nativeEnum(ConfidenceLevel).optional().or(z.literal("")),
    inconclusiveJustification: z.string().trim().max(2000).optional().or(z.literal("")),
    fiveWhysAnalysisId: z.coerce.number().int().positive().optional(),
    contributingFactorIds: z.array(z.coerce.number().int().positive()).optional().default([]),
  })
  .superRefine((data, ctx) => {
    if (data.isInconclusive) {
      if (!data.inconclusiveJustification || data.inconclusiveJustification.length < 20) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Justification must be at least 20 characters.",
          path: ["inconclusiveJustification"],
        });
      }
      return;
    }
    if (!data.description) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Description is required.", path: ["description"] });
    }
    if (!data.category) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Category is required.", path: ["category"] });
    }
    if (!data.supportingEvidence || data.supportingEvidence.length < 10) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Supporting Evidence is required (minimum 10 characters).",
        path: ["supportingEvidence"],
      });
    }
    if (!data.confidenceLevel) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Confidence Level is required.", path: ["confidenceLevel"] });
    }
  });
