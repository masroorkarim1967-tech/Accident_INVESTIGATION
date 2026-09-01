"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { ErrorBanner } from "@/components/ui/ErrorBanner";

/**
 * Route-segment error boundary (technical-architecture.md §7): catches
 * unexpected render-time exceptions, shows the ErrorBanner-styled
 * fallback scoped to the failing segment rather than crashing the whole
 * page. The full error (with stack trace) is logged server-side only —
 * this client boundary receives just `message`/`digest`, never internals
 * (security-spec.md §10).
 */
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center p-6">
      <div className="w-full max-w-md space-y-4">
        <ErrorBanner message="Something went wrong — please try again." />
        <div className="flex justify-center">
          <Button onClick={() => reset()}>Try again</Button>
        </div>
      </div>
    </div>
  );
}
