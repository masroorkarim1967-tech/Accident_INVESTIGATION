import { z } from "zod";

/**
 * FR-005 (Create New Investigation). Occurrence Date is validated against
 * "not in the future" here (client + server, per technical-architecture.md
 * §6) — the server-side check is authoritative regardless of what a native
 * `<input type="date">` already enforced client-side (NFR-4.7).
 */
export const createInvestigationSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title is required.")
    .max(200, "Title must be 200 characters or fewer."),
  occurrenceDate: z
    .string()
    .refine((value) => !Number.isNaN(Date.parse(value)), "Enter a valid date.")
    .refine((value) => new Date(value).getTime() <= Date.now(), "Occurrence date cannot be in the future."),
  reporterName: z
    .string()
    .trim()
    .min(1, "Reporter is required.")
    .max(150, "Reporter must be 150 characters or fewer."),
});

export type CreateInvestigationInput = z.infer<typeof createInvestigationSchema>;

/** FR-006 (Assign/Reassign Investigator). */
export const assignInvestigatorSchema = z.object({
  investigationId: z.coerce.number().int().positive(),
  investigatorUserId: z.coerce.number().int().positive(),
});

export type AssignInvestigatorInput = z.infer<typeof assignInvestigatorSchema>;
