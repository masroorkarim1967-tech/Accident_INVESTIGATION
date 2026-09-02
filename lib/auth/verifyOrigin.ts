/**
 * security-spec.md §4 (closing spec-review.md's CSRF follow-up) — every
 * state-changing Route Handler verifies the request's `Origin` header
 * matches the application's own origin before processing, as
 * defense-in-depth beyond the `SameSite=Lax` session cookie alone. Server
 * Actions get Next.js's built-in same-origin verification automatically;
 * Route Handlers do not, so this is the Route Handler equivalent —
 * called first, before any other logic, same convention as `requireRole`.
 *
 * Compared against `NEXTAUTH_URL` (the one explicitly configured,
 * trusted origin — technical-architecture.md §4.4's addendum), not the
 * request's own `Host` header, for the same reason `proxy.ts`'s
 * `trustHost` note gives: never trust an incoming header as the source of
 * truth for what the app's origin is.
 */
export function verifyOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) {
    // A same-origin request always carries this header for state-changing
    // methods in every browser this application supports (NFR-7.1) — a
    // missing header on a POST/PUT/PATCH/DELETE is itself suspicious, not
    // a false positive to wave through.
    return false;
  }

  const expected = process.env.NEXTAUTH_URL;
  if (!expected) return false;

  try {
    return new URL(origin).origin === new URL(expected).origin;
  } catch {
    return false;
  }
}
