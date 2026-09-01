import { z } from "zod";

const optionalNumber = (min?: number, max?: number) =>
  z
    .string()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? Number(v) : undefined))
    .refine((v) => v === undefined || (!Number.isNaN(v) && (min === undefined || v >= min) && (max === undefined || v <= max)), {
      message: `Must be between ${min} and ${max}.`,
    });

/** FR-015 — Record/Update Location & Operational Conditions. */
export const locationSchema = z.object({
  locationDescription: z.string().trim().min(1, "Location description is required."),
  latitude: optionalNumber(-90, 90),
  longitude: optionalNumber(-180, 180),
  aerodromeCode: z.string().trim().max(10).optional().or(z.literal("")),
  weatherVisibility: z.string().trim().max(50).optional().or(z.literal("")),
  windSpeedKt: optionalNumber(0, undefined),
  windDirectionDeg: optionalNumber(0, 360),
  cloudCover: z.string().trim().max(50).optional().or(z.literal("")),
  temperatureC: optionalNumber(undefined, undefined),
  precipitation: z.string().trim().max(50).optional().or(z.literal("")),
  runwayInUse: z.string().trim().max(20).optional().or(z.literal("")),
  lightingConditions: z.enum(["Day", "Night", "Dusk", "Dawn"]),
  terrainType: z.string().trim().max(50).optional().or(z.literal("")),
});
