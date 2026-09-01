/**
 * Shared demo-account constants (demo-data.md §1.4/§5). Single source of
 * truth for prisma/seed.ts and the "Continue as Viewer" sign-in action
 * (ui-spec.md §1) so the two never drift apart.
 *
 * Not a secret (security-spec.md §9) — a public demo password for
 * fictional accounts, documented in README.md.
 */
export const DEMO_PASSWORD = "Demo!Pass2026";

export const GUEST_VIEWER_EMAIL = "viewer@investigations.example";
