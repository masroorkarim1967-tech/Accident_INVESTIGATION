import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe partial Auth.js config — no providers, no adapter, no
 * Node-only imports (bcrypt, Prisma). Auth.js's own documented pattern for
 * splitting config so `proxy.ts` (Next.js 16's renamed middleware.ts,
 * technical-architecture.md §4.4 addendum) can check for a session without
 * pulling in the full Node.js-only auth stack.
 *
 * `authorized` here is a lightweight "is there a session at all" gate —
 * NOT the real authorization boundary. The actual role/isActive check
 * happens in requireRole (lib/auth/requireRole.ts), which always re-reads
 * the database, per technical-architecture.md §4.4's addendum.
 */
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  // Auth.js auto-trusts the host when it detects Vercel's own VERCEL env
  // var, but that detection is documented as unreliable in some Vercel
  // configurations, and would be entirely absent on any other host. Found
  // via production-mode (`next start`) testing: without this, every auth
  // request — including this edge config's own session check in proxy.ts
  // — fails with UntrustedHost, invisible in `next dev`, which trusts
  // localhost automatically. Safe here specifically because NEXTAUTH_URL
  // is always set explicitly (technical-architecture.md §11) — this isn't
  // blindly trusting an arbitrary incoming Host header.
  trustHost: true,
  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const isWorkspaceRoute = !request.nextUrl.pathname.startsWith("/login");
      if (isWorkspaceRoute && !isLoggedIn) {
        return false;
      }
      return true;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
