import { z } from "zod";
import { ActionPriority, VerificationMethod, EffectivenessResult } from "@/prisma/generated/prisma/client";

/**
 * FR-040 — Add/Edit Corrective Action. The future-date-at-creation rule
 * (FR-040 edge case: only new actions, not edits) is checked in the
 * action, not here, since this schema alone can't see whether it's a
 * create or an edit.
 */
export const correctiveActionSchema = z
  .object({
    description: z.string().trim().min(1, "Description is required."),
    priority: z.nativeEnum(ActionPriority),
    targetDate: z.string().refine((v) => !Number.isNaN(Date.parse(v)), "Enter a valid date."),
    ownerUserId: z.coerce.number().int().positive().optional(),
    ownerExternalName: z.string().trim().max(150).optional().or(z.literal("")),
    department: z.string().trim().max(100).optional().or(z.literal("")),
    rootCauseId: z.coerce.number().int().positive().optional(),
    hazardId: z.coerce.number().int().positive().optional(),
    requiredForClosure: z.boolean(),
    investigatorComments: z.string().trim().max(10000).optional().or(z.literal("")),
  })
  .refine((data) => Boolean(data.ownerUserId) !== Boolean(data.ownerExternalName), {
    message: "Exactly one of a registered Responsible Person or an external name is required.",
    path: ["ownerExternalName"],
  });

/** FR-045a — Mark Action Complete. */
export const completeActionSchema = z.object({
  completedDate: z
    .string()
    .refine((v) => !Number.isNaN(Date.parse(v)), "Enter a valid date.")
    .refine((v) => new Date(v).getTime() <= Date.now(), "Completion Date cannot be in the future."),
});

/** FR-045b — Verify Action Effectiveness. */
export const verifyActionSchema = z.object({
  verificationMethod: z.nativeEnum(VerificationMethod),
  effectivenessResult: z.nativeEnum(EffectivenessResult),
  verificationNotes: z.string().trim().max(5000).optional().or(z.literal("")),
});

/** FR-047 — Reassign Action Owner. */
export const reassignActionOwnerSchema = z
  .object({
    ownerUserId: z.coerce.number().int().positive().optional(),
    ownerExternalName: z.string().trim().max(150).optional().or(z.literal("")),
    department: z.string().trim().max(100).optional().or(z.literal("")),
  })
  .refine((data) => Boolean(data.ownerUserId) !== Boolean(data.ownerExternalName), {
    message: "Exactly one of a registered Responsible Person or an external name is required.",
    path: ["ownerExternalName"],
  });
