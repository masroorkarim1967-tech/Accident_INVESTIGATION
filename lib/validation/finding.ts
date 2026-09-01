import { z } from "zod";
import { FindingType } from "@/prisma/generated/prisma/client";

/** FR-072 — Add/Edit Finding, with FR-074's citation multi-selects folded in. */
export const findingSchema = z.object({
  findingType: z.nativeEnum(FindingType),
  description: z.string().trim().min(20, "Description must be at least 20 characters."),
  hazardIds: z.array(z.coerce.number().int().positive()).optional().default([]),
  contributingFactorIds: z.array(z.coerce.number().int().positive()).optional().default([]),
  rootCauseIds: z.array(z.coerce.number().int().positive()).optional().default([]),
});
