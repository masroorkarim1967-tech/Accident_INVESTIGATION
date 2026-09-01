/**
 * Shared ErrorBanner primitive (ui-spec.md §4): red-bordered inline panel
 * with a warning-triangle icon, for page/section-scoped errors.
 */
export function ErrorBanner({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded border border-red bg-red/10 px-4 py-3 text-sm text-red"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="mt-0.5 h-4 w-4 flex-shrink-0"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"
        />
      </svg>
      <span>{message}</span>
    </div>
  );
}
