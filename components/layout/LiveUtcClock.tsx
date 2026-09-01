"use client";

import { useSyncExternalStore } from "react";

/**
 * Live UTC clock (ui-spec.md §2.1) — "a signature 'Ops Board' touch."
 * `aria-live="off"`: a constantly-ticking clock should not be announced to
 * screen readers on every update (ui-spec.md §5).
 *
 * useSyncExternalStore (not useState+useEffect) — the correct API for
 * subscribing to an external, non-React value (wall-clock time) without a
 * server/client hydration mismatch.
 */
function formatUtc(date: Date): string {
  return date.toISOString().slice(11, 19) + "Z";
}

function subscribe(callback: () => void) {
  const interval = setInterval(callback, 1000);
  return () => clearInterval(interval);
}

function getSnapshot(): string {
  return formatUtc(new Date());
}

function getServerSnapshot(): string {
  return "--:--:--Z";
}

export function LiveUtcClock() {
  const now = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return (
    <span aria-live="off" className="font-mono text-sm text-teal">
      {now}
    </span>
  );
}
