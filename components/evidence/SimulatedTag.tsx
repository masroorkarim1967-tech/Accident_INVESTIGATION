/**
 * SimulatedTag (ui-spec.md §4, data-model.md §6.10.2): a small slate-
 * outlined pill marking a placeholder attachment (`Attachment.isSimulated
 * = true`) — visually distinct from a real file's plain chip styling, and
 * always shown before the file is opened/downloaded (FR-024), never only
 * on hover, so it can't be missed.
 */
export function SimulatedTag() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-slate px-2 py-0.5 text-xs text-slate">
      Simulated
    </span>
  );
}
