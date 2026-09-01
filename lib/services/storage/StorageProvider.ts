/**
 * StorageProvider abstraction (data-model.md §6.10.1, technical-architecture.md
 * §9). Evidence/Attachment business logic never touches storage mechanics
 * directly — only this interface. The v1 implementation
 * (PostgresBlobStorageProvider) stores bytes in a Postgres `Bytes` column
 * rather than local disk, because Vercel's serverless filesystem cannot
 * durably persist an upload across invocations (technical-architecture.md
 * §9, TA-1 — a required correction, not an optional one, closing
 * spec-review.md SR-001/SR-002). A future object-storage-backed provider
 * (Vercel Blob, S3) implementing this same interface is a swap-in change,
 * not a rewrite.
 */
export interface StorageProvider {
  /** Persists the file and returns an opaque handle (never a raw filesystem path). */
  save(fileBytes: Buffer, fileName: string, mimeType: string): Promise<string>;
  /** Resolves a previously-saved handle back to its bytes. */
  retrieve(storagePath: string): Promise<Buffer>;
  /** Removes the stored file. Never throws if already absent — deletion is idempotent. */
  delete(storagePath: string): Promise<void>;
}
