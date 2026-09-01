/**
 * Role badge shown in the App Header (ui-spec.md §2.1): colored per role —
 * Administrator=violet, Investigation Manager=teal, Investigator=amber,
 * Reviewer=blue, Viewer=slate.
 */
const ROLE_LABELS: Record<string, string> = {
  Administrator: "Administrator",
  InvestigationManager: "Investigation Manager",
  Investigator: "Investigator",
  Reviewer: "Reviewer",
  Viewer: "Viewer",
};

const ROLE_COLOR_CLASSES: Record<string, string> = {
  Administrator: "border-violet text-violet",
  InvestigationManager: "border-teal text-teal",
  Investigator: "border-amber text-amber",
  Reviewer: "border-blue text-blue",
  Viewer: "border-slate text-slate",
};

export function RoleBadge({ role }: { role: string }) {
  const colorClasses = ROLE_COLOR_CLASSES[role] ?? "border-slate text-slate";
  const label = ROLE_LABELS[role] ?? role;

  return (
    <span
      className={`rounded-full border px-2.5 py-0.5 font-mono text-xs uppercase tracking-wide ${colorClasses}`}
    >
      {label}
    </span>
  );
}
