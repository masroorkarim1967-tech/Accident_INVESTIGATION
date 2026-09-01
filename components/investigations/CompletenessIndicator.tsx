/**
 * CompletenessDot (ui-spec.md §2.3): hollow gray = Not Started,
 * half-filled amber = In Progress, filled green = Complete.
 */
export type CompletenessState = "not-started" | "in-progress" | "complete";

const STATE_CLASSES: Record<CompletenessState, string> = {
  "not-started": "border-slate bg-transparent",
  "in-progress": "border-amber bg-amber/50",
  complete: "border-green bg-green",
};

const STATE_LABELS: Record<CompletenessState, string> = {
  "not-started": "Not started",
  "in-progress": "In progress",
  complete: "Complete",
};

export function CompletenessIndicator({ state }: { state: CompletenessState }) {
  return (
    <span
      role="img"
      aria-label={STATE_LABELS[state]}
      title={STATE_LABELS[state]}
      className={`inline-block h-2.5 w-2.5 flex-shrink-0 rounded-full border ${STATE_CLASSES[state]}`}
    />
  );
}
