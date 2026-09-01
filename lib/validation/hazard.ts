import { z } from "zod";
import { HazardCategory, RiskLikelihood, RiskSeverity } from "@/prisma/generated/prisma/client";

/** FR-029 — Add/Edit Hazard (core fields + Initial Risk). */
export const hazardSchema = z.object({
  description: z.string().trim().min(1, "Description is required."),
  hazardCategory: z.nativeEnum(HazardCategory),
  initialLikelihood: z.nativeEnum(RiskLikelihood),
  initialSeverity: z.nativeEnum(RiskSeverity),
});

/**
 * FR-068 — Existing Controls and Residual Risk. Residual Likelihood and
 * Residual Severity must both be set together (not one without the
 * other) — the same "both or neither" shape as
 * `occurrenceOutcomeSchema`'s siblings, but Existing Controls staying
 * optional even when both are set (data-model.md §3.12's worked example:
 * a control judged not to reduce risk still gets a residual assessment).
 */
export const hazardResidualRiskSchema = z
  .object({
    existingControls: z.string().trim().max(10000).optional().or(z.literal("")),
    residualLikelihood: z.nativeEnum(RiskLikelihood).optional().or(z.literal("")),
    residualSeverity: z.nativeEnum(RiskSeverity).optional().or(z.literal("")),
  })
  .refine((data) => Boolean(data.residualLikelihood) === Boolean(data.residualSeverity), {
    message: "Residual Likelihood and Residual Severity must both be set together.",
    path: ["residualSeverity"],
  });
