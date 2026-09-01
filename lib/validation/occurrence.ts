import { z } from "zod";
import {
  OccurrenceCategory,
  RiskSeverity,
  RiskLikelihood,
  PhaseOfFlight,
} from "@/prisma/generated/prisma/client";

const SEVERITY_RANK: Record<RiskSeverity, number> = {
  Negligible: 1,
  Minor: 2,
  Moderate: 3,
  Major: 4,
  Catastrophic: 5,
};

/** FR-012 — Narrative tab. edge-cases.md EC-21: 10,000-char cap on narrative text. */
export const occurrenceNarrativeSchema = z.object({
  occurrenceDate: z.string().refine((v) => !Number.isNaN(Date.parse(v)), "Enter a valid date."),
  occurrenceTimeUtc: z.string().min(1, "Occurrence time (UTC) is required."),
  occurrenceTimeLocal: z.string().optional().or(z.literal("")),
  phaseOfFlight: z.nativeEnum(PhaseOfFlight),
  briefDescription: z.string().trim().min(1, "Brief description is required.").max(240),
  narrativeDescription: z.string().trim().min(20, "Narrative must be at least 20 characters.").max(10000),
});

/** FR-027 — Classification tab (category/subcategory only). */
export const occurrenceClassificationSchema = z.object({
  occurrenceCategory: z.nativeEnum(OccurrenceCategory),
  occurrenceSubcategoryId: z.coerce.number().int().positive(),
});

/** FR-066 — Actual/Potential Outcome + Likelihood of Recurrence. */
export const occurrenceOutcomeSchema = z
  .object({
    actualOutcomeSeverity: z.nativeEnum(RiskSeverity),
    actualOutcomeDescription: z.string().trim().min(10).max(10000),
    potentialOutcomeSeverity: z.nativeEnum(RiskSeverity),
    potentialOutcomeDescription: z.string().trim().min(10).max(10000),
    likelihoodOfRecurrence: z.nativeEnum(RiskLikelihood),
  })
  .refine((data) => SEVERITY_RANK[data.potentialOutcomeSeverity] >= SEVERITY_RANK[data.actualOutcomeSeverity], {
    message: "Potential Outcome Severity cannot be milder than Actual Outcome Severity.",
    path: ["potentialOutcomeSeverity"],
  });

/** FR-067 — manual override of a computed Severity/Priority field. */
export const occurrenceOverrideSchema = z.object({
  field: z.enum(["severity", "investigationPriority"]),
  justification: z.string().trim().min(20, "Justification must be at least 20 characters."),
  severityValue: z.nativeEnum(RiskSeverity).optional(),
  priorityValue: z.enum(["Routine", "Elevated", "Urgent", "Immediate"]).optional(),
});
