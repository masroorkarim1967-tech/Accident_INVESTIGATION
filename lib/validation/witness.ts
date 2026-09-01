import { z } from "zod";
import { WitnessType, AssessmentLevel } from "@/prisma/generated/prisma/client";

/** FR-019 — Add/Edit Witness. */
export const witnessSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(150),
  contactInfo: z.string().trim().max(200).optional().or(z.literal("")),
  witnessType: z.nativeEnum(WitnessType),
  statementSummary: z.string().trim().min(10, "Statement summary must be at least 10 characters."),
  statementDate: z
    .string()
    .optional()
    .or(z.literal(""))
    .refine((v) => !v || !Number.isNaN(Date.parse(v)), "Enter a valid date."),
  reliabilityAssessment: z.nativeEnum(AssessmentLevel),
  reliabilityNotes: z.string().trim().max(5000).optional().or(z.literal("")),
});
