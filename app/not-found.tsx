import Link from "next/link";

/**
 * Custom 404 (FR-009's "Investigation not found" pattern generalized to
 * the whole app) — replaces Next.js's default blank 404 with one matching
 * the Ops Board identity.
 */
export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <section className="w-full max-w-md rounded border border-border bg-surface p-8 text-center">
        <p className="font-mono text-xs uppercase tracking-widest text-teal">
          Aviation Incident Investigation Assistant
        </p>
        <h1 className="mt-4 font-mono text-4xl font-semibold text-foreground">404</h1>
        <p className="mt-2 text-sm text-muted">This page could not be found.</p>
        <Link
          href="/"
          className="mt-6 inline-block rounded border border-amber px-4 py-2 text-sm text-amber hover:bg-amber/10"
        >
          Return home
        </Link>
      </section>
    </main>
  );
}
