"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "application/pdf", "text/plain"];
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

/**
 * FR-023 — client-side pre-check for immediate feedback only; the Route
 * Handler (`app/api/evidence/[id]/attachment/route.ts`) re-validates
 * everything server-side, which is the authoritative check (NFR-4.5).
 * Uses `fetch` + `router.refresh()` rather than a Server Action, since
 * file upload is exactly the case technical-architecture.md TA-3 reserves
 * for Route Handlers.
 */
export function AttachmentUploader({ evidenceId }: { evidenceId: number }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileSelected(file: File) {
    setError(null);

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      setError(`File type not accepted. Allowed types: ${ALLOWED_MIME_TYPES.join(", ")}.`);
      return;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError("File exceeds the 10MB per-file limit.");
      return;
    }

    setPending(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(`/api/evidence/${evidenceId}/attachment`, {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setError(body?.error?.message ?? "Upload failed.");
        return;
      }
      router.refresh();
    } catch {
      setError("Upload failed. Check your connection and try again.");
    } finally {
      setPending(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept={ALLOWED_MIME_TYPES.join(",")}
          disabled={pending}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFileSelected(file);
          }}
          className="hidden"
          id={`attachment-input-${evidenceId}`}
        />
        <Button
          type="button"
          variant="secondary"
          disabled={pending}
          onClick={() => inputRef.current?.click()}
        >
          {pending ? "Uploading…" : "Upload File"}
        </Button>
        <span className="text-xs text-muted">JPEG, PNG, PDF, or plain text — up to 10MB.</span>
      </div>
      {error && <p className="text-xs text-red">{error}</p>}
    </div>
  );
}
