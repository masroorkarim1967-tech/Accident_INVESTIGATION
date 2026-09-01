import { z } from "zod";
import { FactorCategory } from "@/prisma/generated/prisma/client";

/** FR-031 — Add/Edit Contributing Factor. hazardIds is the optional link to existing Hazards. */
export const contributingFactorSchema = z.object({
  description: z.string().trim().min(1, "Description is required."),
  category: z.nativeEnum(FactorCategory),
  hazardIds: z.array(z.coerce.number().int().positive()).optional().default([]),
});
