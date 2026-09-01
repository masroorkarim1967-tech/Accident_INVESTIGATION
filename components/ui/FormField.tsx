/** Small shared labeled-input helper for the many plain single-record forms in Phase 5+. */
export function FormField({
  label,
  name,
  type = "text",
  defaultValue,
  required,
  disabled,
  maxLength,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string | number;
  required?: boolean;
  disabled?: boolean;
  maxLength?: number;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={name} className="text-sm text-muted">{label}</label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        disabled={disabled}
        maxLength={maxLength}
        defaultValue={defaultValue ?? ""}
        className="rounded border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-teal disabled:opacity-60"
      />
    </div>
  );
}
