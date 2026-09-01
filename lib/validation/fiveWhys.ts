import { z } from "zod";

/** FR-034 — Start New 5 Whys Analysis. */
export const fiveWhysAnalysisSchema = z.object({
  problemStatement: z.string().trim().min(10, "Problem Statement must be at least 10 characters."),
});

/** FR-035 — Add/Edit Why Entry. sequenceNumber is auto-assigned by the action, not user input. */
export const fiveWhysEntrySchema = z.object({
  question: z.string().trim().min(1, "Question is required."),
  answer: z.string().trim().min(1, "Answer is required."),
});
