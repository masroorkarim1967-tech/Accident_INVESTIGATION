import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { visibilityFilter } from "@/lib/services/investigationQueries";
import { PostgresBlobStorageProvider } from "@/lib/services/storage/PostgresBlobStorageProvider";

/**
 * FR-024 — View/Download Evidence Attachment. Access rule matches FR-009's
 * view-access scoping exactly (ADMIN/MANAGER/REVIEWER unrestricted,
 * INVESTIGATOR own/assigned only, VIEWER non-Draft only) — reuses
 * `visibilityFilter` rather than re-deriving the same rule a second time.
 * Re-checked on every request (security-spec.md §13): a previously-valid
 * link is never a standing bypass.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ attachmentId: string }> }) {
  const { attachmentId } = await params;
  const id = Number(attachmentId);
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "File unavailable." } }, { status: 404 });
  }

  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Not authenticated." } }, { status: 401 });
  }

  const attachment = await db.attachment.findUnique({
    where: { id },
    select: {
      storagePath: true,
      fileName: true,
      mimeType: true,
      evidence: { select: { investigationId: true } },
    },
  });
  if (!attachment) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "File unavailable." } }, { status: 404 });
  }

  const hasViewAccess = await db.investigation.findFirst({
    where: { AND: [{ id: attachment.evidence.investigationId }, visibilityFilter(currentUser)] },
    select: { id: true },
  });
  if (!hasViewAccess) {
    return NextResponse.json({ error: { code: "FORBIDDEN", message: "Not authorized to view this file." } }, { status: 403 });
  }

  let fileBytes: Buffer;
  try {
    fileBytes = await new PostgresBlobStorageProvider().retrieve(attachment.storagePath);
  } catch {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "File unavailable." } }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(fileBytes), {
    status: 200,
    headers: {
      "Content-Type": attachment.mimeType,
      "Content-Disposition": `inline; filename="${attachment.fileName.replace(/"/g, "")}"`,
      // Prevents a browser from sniffing an uploaded file as HTML/script
      // regardless of its stored (validated) Content-Type — security-spec.md §13.
      "X-Content-Type-Options": "nosniff",
    },
  });
}
