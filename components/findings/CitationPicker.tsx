"use client";

/** FR-074 — a labeled multi-select checkbox list of one citable item type (Hazard/Contributing Factor/Root Cause). */
export function CitationPicker({
  label,
  name,
  items,
  selectedIds,
  onToggle,
}: {
  label: string;
  name: string;
  items: { id: number; description: string }[];
  selectedIds: number[];
  onToggle: (id: number) => void;
}) {
  if (items.length === 0) return null;

  return (
    <div className="flex flex-col gap-1">
      <p className="text-sm text-muted">{label} (optional)</p>
      <div className="flex flex-col gap-1">
        {items.map((item) => (
          <label key={item.id} className="flex items-center gap-2 text-sm text-foreground">
            <input type="checkbox" checked={selectedIds.includes(item.id)} onChange={() => onToggle(item.id)} />
            {item.description}
          </label>
        ))}
      </div>
      {selectedIds.map((id) => (
        <input key={id} type="hidden" name={name} value={id} />
      ))}
    </div>
  );
}
