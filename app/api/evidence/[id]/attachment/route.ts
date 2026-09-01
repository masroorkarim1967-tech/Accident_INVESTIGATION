import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireInvestigationEditAccess } from "@/lib/auth/requireInvestigationEditAccess";
import { AuthorizationError, NotFoundError } from "@/lib/errors";
import { PostgresBlobStorageProvider } from "@/lib/services/storage/PostgresBlobStorageProvider";
import {
  ALLOWED_ATTACHMENT_MIME_TYPES,
  MAX_ATTACHMENT_FILE_SIZE_BYTES,
  MAX_INVESTIGATION_ATTACHMENT_TOTAL_BYTES,
  isAllowedAttachmentMimeType,
  sanitizeFileName,
} from "@/lib/validation/evidence";
import { UserRole } from "@/prisma/generated/prisma/client";

const EDIT_ROLES = [UserRole.Administrator, UserRole.InvestigationManager, UserRole.Investigator];

/**
 * FR-023 — Upload Evidence Attachment. A Route Handler, not a Server
 * Action, per technical-architecture.md TA-3: file upload is exactly the
 * "streaming/multipart" case Server Actions are a poor fit for.
 *
 * `[id]` is the Evidence item's id (not the investigation's) — the
 * investigation is resolved from it so the standard edit-access check
 * still applies before any bytes are read from the request.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const evidenceId = Number(id);
  if (!Number.isInteger(evidenceId)) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "Evidence item not found." } }, { status: 404 });
  }

  const evidence = await db.evidence.findUnique({ where: { id: evidenceId } });
  if (!evidence) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "Evidence item not found." } }, { status: 404 });
  }

  let user;
  try {
    ({ user } = await requireInvestigationEditAccess(evidence.investigationId, EDIT_ROLES));
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: { code: "FORBIDDEN", message: error.message } }, { status: 403 });
    }
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: error.message } }, { status: 404 });
    }
    throw error;
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: { code: "VALIDATION", message: "No file provided." } }, { status: 400 });
  }

  // Authoritative server-side checks (NFR-4.5) — never trust the client's
  // own pre-check alone.
  if (!isAllowedAttachmentMimeType(file.type)) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION",
          message: `File type not accepted. Allowed types: ${ALLOWED_ATTACHMENT_MIME_TYPES.join(", ")}.`,
        },
      },
      { status: 400 },
    );
  }
  if (file.size > MAX_ATTACHMENT_FILE_SIZE_BYTES) {
    return NextResponse.json(
      { error: { code: "VALIDATION", message: "File exceeds the 10MB per-file limit." } },
      { status: 400 },
    );
  }

  // EC-26 — per-investigation cumulative cap, checked and rejected before
  // any bytes are persisted (the Bytes-column design makes this trivially
  // clean — there is no partial file on a filesystem to clean up).
  const existingTotal = await db.attachment.aggregate({
    where: { evidence: { investigationId: evidence.investigationId } },
    _sum: { fileSizeBytes: true },
  });
  const currentUsage = existingTotal._sum.fileSizeBytes ?? 0;
  if (currentUsage + file.size > MAX_INVESTIGATION_ATTACHMENT_TOTAL_BYTES) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION",
          message: `This investigation's attachment storage limit has been reached (${(currentUsage / (1024 * 1024)).toFixed(1)}MB of 100MB used).`,
        },
      },
      { status: 400 },
    );
  }

  const fileBytes = Buffer.from(await file.arrayBuffer());
  const storageProvider = new PostgresBlobStorageProvider();
  const storagePath = await storageProvider.save(fileBytes, file.name, file.type);

  const attachment = await db.attachment.create({
    data: {
      evidenceId,
      fileName: sanitizeFileName(file.name),
      mimeType: file.type,
      fileSizeBytes: file.size,
      storagePath,
      fileBytes,
      isSimulated: false,
      uploadedByUserId: user.id,
    },
    select: { id: true, fileName: true, mimeType: true, fileSizeBytes: true, isSimulated: true, uploadedAt: true },
  });

  return NextResponse.json({ attachment }, { status: 201 });
}
