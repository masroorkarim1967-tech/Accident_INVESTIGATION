import { z } from "zod";
import { PersonRoleType, InjuryLevel } from "@/prisma/generated/prisma/client";

/** FR-016 — Add/Edit Person Involved. */
export const personSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(150),
  roleType: z.nativeEnum(PersonRoleType),
  licenseNumber: z.string().trim().max(50).optional().or(z.literal("")),
  nationality: z.string().trim().max(60).optional().or(z.literal("")),
  injuryLevel: z.nativeEnum(InjuryLevel),
  notes: z.string().trim().max(5000).optional().or(z.literal("")),
});
