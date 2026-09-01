import { z } from "zod";
import { ImmediateActionType } from "@/prisma/generated/prisma/client";

/** FR-025 — Add/Edit Immediate Action. Date-ordering (>= occurrence date/time) is checked server-side in the action, since it needs the parent Occurrence row. */
export const immediateActionSchema = z.object({
  description: z.string().trim().min(1, "Description is required."),
  takenBy: z.string().trim().min(1, "Taken By is required.").max(150),
  occurredAt: z.string().refine((v) => !Number.isNaN(Date.parse(v)), "Enter a valid date/time."),
  actionType: z.nativeEnum(ImmediateActionType),
});
