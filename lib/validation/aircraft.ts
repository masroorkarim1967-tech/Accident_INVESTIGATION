import { z } from "zod";
import { DamageLevel } from "@/prisma/generated/prisma/client";

/** FR-013 — Record/Update Aircraft Information. */
export const aircraftSchema = z.object({
  registration: z.string().trim().min(1, "Registration is required.").max(20),
  manufacturer: z.string().trim().min(1, "Manufacturer is required.").max(100),
  model: z.string().trim().min(1, "Model is required.").max(100),
  serialNumber: z.string().trim().max(50).optional().or(z.literal("")),
  yearOfManufacture: z
    .string()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? Number(v) : undefined))
    .refine((v) => v === undefined || (Number.isInteger(v) && v <= new Date().getUTCFullYear()), {
      message: "Year of manufacture cannot be later than the current year.",
    }),
  operatorName: z.string().trim().min(1, "Operator name is required.").max(150),
  engineType: z.string().trim().max(100).optional().or(z.literal("")),
  engineCount: z.coerce.number().int().positive("Engine count must be a positive number."),
  damageLevel: z.nativeEnum(DamageLevel),
});
