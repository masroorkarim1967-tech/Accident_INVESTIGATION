import { z } from "zod";
import { FlightRules } from "@/prisma/generated/prisma/client";

/** FR-014 — Record/Update Flight Information. */
export const flightSchema = z.object({
  flightNumber: z.string().trim().max(20).optional().or(z.literal("")),
  flightRules: z.nativeEnum(FlightRules),
  departureAerodrome: z.string().trim().min(1, "Departure aerodrome is required.").max(100),
  destinationAerodrome: z.string().trim().min(1, "Destination aerodrome is required.").max(100),
  alternateAerodrome: z.string().trim().max(100).optional().or(z.literal("")),
  picName: z.string().trim().min(1, "PIC name is required.").max(150),
  picLicenseNumber: z.string().trim().max(50).optional().or(z.literal("")),
  crewComplement: z.coerce.number().int().positive("Crew complement must be a positive number."),
});
