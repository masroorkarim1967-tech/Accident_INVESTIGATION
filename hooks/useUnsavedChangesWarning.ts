"use client";

import { useEffect } from "react";

/**
 * edge-cases.md EC-17, layer 2 — a `beforeunload` handler registered
 * whenever a form has unsaved changes, triggering the browser's own
 * native "Leave site? Changes you made may not be saved" dialog.
 * Browsers do not allow a custom message here for security reasons, so
 * the wording is generic, not app-specific — a browser platform
 * limitation, not a gap in this application's design (documented as
 * such in edge-cases.md rather than left implicit).
 *
 * Layer 1 (in-app navigation, e.g. Section Stepper links) and layer 3
 * (a crash/power-loss/confirmed-past-the-warning refresh genuinely
 * losing unsaved data) are separate, already-scoped concerns — this
 * hook is only the browser-level piece.
 *
 * Usage: call with a boolean the form itself derives (e.g. toggled true
 * on any field's onChange, reset to false after a successful save).
 */
export function useUnsavedChangesWarning(isDirty: boolean) {
  useEffect(() => {
    if (!isDirty) return;

    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);
}
