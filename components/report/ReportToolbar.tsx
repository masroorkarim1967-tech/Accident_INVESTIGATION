"use client";

import Link from "next/link";

/**
 * ui-spec.md §17 — Report Preview toolbar: Print/Save as PDF (FR-057, pure
 * browser `window.print()`, no server-side rendering per RPT-1), Export
 * JSON (FR-058), Back to Investigation. Hidden from the printed output
 * itself (`print:hidden`) — it's UI chrome, not report content.
 */
export function ReportToolbar({ investigationId }: { investigationId: number }) {
  return (
    <div className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-300 bg-slate-50 px-6 py-3 print:hidden">
      <Link href={`/investigations/${investigationId}`} className="text-sm text-slate-600 hover:text-slate-900 hover:underline">
        ← Back to Investigation
      </Link>
      <div className="flex gap-2">
        <a
          href={`/api/investigations/${investigationId}/export`}
          className="rounded border border-slate-400 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
        >
          Export JSON
        </a>
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded border border-slate-400 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
        >
          Print / Save as PDF
        </button>
      </div>
    </div>
  );
}
