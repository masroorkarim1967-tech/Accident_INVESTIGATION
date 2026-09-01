import crypto from "node:crypto";
import { db } from "@/lib/db";
import type { StorageProvider } from "./StorageProvider";

/**
 * v1 StorageProvider implementation (technical-architecture.md §9, TA-1):
 * bytes live in the `Attachment.fileBytes` Postgres column, not a
 * filesystem, since Vercel's serverless filesystem is ephemeral.
 *
 * Because the blob lives directly on the domain row (`Attachment`) rather
 * than a separate generic blob table, this implementation is intentionally
 * asymmetric:
 *  - `save` only generates the opaque `storagePath` handle — it does not
 *    write to the database itself, since it has no `evidenceId` to create
 *    the `Attachment` row with. The caller (an evidence Server Action)
 *    creates the row in one transaction using the bytes it already has and
 *    the `storagePath` this returns, satisfying the interface's contract
 *    that the caller never invents its own handle.
 *  - `retrieve`/`delete` DO real database work — they are the only
 *    operations that make sense purely in terms of the opaque handle.
 *
 * Every method still honors the `StorageProvider` interface exactly, so a
 * future object-storage-backed provider (where `storagePath` becomes a
 * real object key) is a swap-in change, not a rewrite.
 */
export class PostgresBlobStorageProvider implements StorageProvider {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- required by the StorageProvider interface; see the class-level comment for why this implementation doesn't need them.
  async save(fileBytes: Buffer, fileName: string, mimeType: string): Promise<string> {
    return crypto.randomUUID();
  }

  async retrieve(storagePath: string): Promise<Buffer> {
    const attachment = await db.attachment.findUnique({
      where: { storagePath },
      select: { fileBytes: true },
    });
    if (!attachment) {
      throw new Error("File unavailable.");
    }
    return Buffer.from(attachment.fileBytes);
  }

  async delete(storagePath: string): Promise<void> {
    // Idempotent — deleting an already-absent file is not an error. In
    // practice this project relies on Prisma's onDelete: Cascade when an
    // entire Evidence item is removed (FR-022); this method exists for
    // interface completeness and for a future object-storage provider,
    // where cascade alone would not clean up an external bucket.
    await db.attachment.deleteMany({ where: { storagePath } });
  }
}
