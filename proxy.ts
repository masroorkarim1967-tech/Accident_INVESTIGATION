import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth/config";

/**
 * Next.js 16 renamed `middleware.ts` to `proxy.ts` (technical-architecture.md
 * §4.4's addendum) and now runs it on the Node.js runtime by default, but
 * Next.js's own guidance is still to keep it a "thin proxy" — a session
 * presence check and redirect, not real authorization. The actual
 * role/isActive check happens in requireRole (lib/auth/requireRole.ts) at
 * the Server Action/Route Handler layer, never here.
 *
 * Uses the edge-safe partial config (no providers, no bcrypt/Prisma
 * imports) — the full config in lib/auth/index.ts is Node-only and must
 * never be imported from this file.
 */
const { auth } = NextAuth(authConfig);

export default auth;

export const config = {
  // robots.txt (and any future top-level metadata route like sitemap.xml)
  // must stay reachable without a session — a crawler never has one, and
  // gating it behind a login redirect defeats its purpose (found during
  // production-readiness testing: it was being redirected to /login).
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|robots.txt).*)"],
};
