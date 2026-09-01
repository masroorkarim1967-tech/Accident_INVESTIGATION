import { db } from "@/lib/db";
import type { HistoryEventType, InvestigationStatus, Prisma } from "@/prisma/generated/prisma/client";

/**
 * Shared history-logging service (data-model.md §3.24) — called by every
 * mutating action from this phase onward. Accepts an optional Prisma
 * transaction client so a caller can log history in the same transaction
 * as the mutation it records, per data-model.md §3.24's requirement that
 * every event is attributed to a real acting user.
 */
export async function logInvestigationHistory(
  params: {
    investigationId: number;
    eventType: HistoryEventType;
    performedByUserId: number;
    fromStatus?: InvestigationStatus;
    toStatus?: InvestigationStatus;
    reasonText?: string;
  },
  client: Prisma.TransactionClient | typeof db = db,
): Promise<void> {
  await client.investigationHistory.create({
    data: {
      investigationId: params.investigationId,
      eventType: params.eventType,
      performedByUserId: params.performedByUserId,
      fromStatus: params.fromStatus,
      toStatus: params.toStatus,
      reasonText: params.reasonText,
    },
  });
}
