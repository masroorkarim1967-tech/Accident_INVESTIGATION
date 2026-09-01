"use client";

import { useSyncExternalStore } from "react";

/**
 * Persistent disclaimer ribbon (product-spec.md §11.2, ui-spec.md §2.2).
 * Dismissible per browser session (sessionStorage — clears when the tab
 * closes, so it reappears "on next login" in a fresh session) but never
 * fully removable: dismissing it only hides it for the rest of this
 * session, never permanently.
 *
 * useSyncExternalStore (not useState+useEffect) — reads sessionStorage, an
 * external, non-React store, without a server/client hydration mismatch.
 */
const DISCLAIMER_TEXT =
  "This application uses simulated, fictional aviation incident data for demonstration purposes " +
  "only. It is not affiliated with any aviation authority and must not be used for real safety " +
  "investigations or regulatory reporting.";

const DISMISS_KEY = "disclaimer-ribbon-dismissed";
const DISMISS_EVENT = "disclaimer-ribbon-dismiss-changed";

function subscribe(callback: () => void) {
  window.addEventListener(DISMISS_EVENT, callback);
  return () => window.removeEventListener(DISMISS_EVENT, callback);
}

function getSnapshot(): boolean {
  try {
    return sessionStorage.getItem(DISMISS_KEY) === "true";
  } catch {
    return false;
  }
}

function getServerSnapshot(): boolean {
  return false;
}

export function DisclaimerRibbon() {
  const dismissed = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  if (dismissed) {
    return null;
  }

  function handleDismiss() {
    try {
      sessionStorage.setItem(DISMISS_KEY, "true");
    } catch {
      // Storage unavailable (private browsing, etc.) — dismissal just
      // won't persist across navigations; not worth failing over.
    }
    window.dispatchEvent(new Event(DISMISS_EVENT));
  }

  return (
    <div className="flex items-center justify-between gap-4 border-b border-border bg-amber-muted/20 px-4 py-1.5 text-xs text-amber">
      <p className="min-w-0">{DISCLAIMER_TEXT}</p>
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Dismiss disclaimer for this session"
        className="flex-shrink-0 text-amber hover:text-foreground"
      >
        ✕
      </button>
    </div>
  );
}
