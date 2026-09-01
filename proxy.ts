import { NextResponse } from "next/server";
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
 *
 * Also generates the per-request CSP nonce here (Next.js's documented
 * pattern: https://nextjs.org/docs/app/guides/content-security-policy).
 * A static CSP in next.config.ts blocked Next.js's own inline
 * hydration/RSC-streaming scripts outright — the app never hydrated
 * (self.__next_r invariant, found during Phase 5 live browser
 * verification: form fields resolved in the DOM but stayed inert). The
 * redirect logic below replicates authConfig's `authorized` callback
 * manually — wrapping `auth()` with a callback bypasses that callback, so
 * both concerns (auth gate + CSP) have to live in the one function.
 */
const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const isLoggedIn = !!req.auth?.user;
  // "/" is the public landing page (components/landing/LandingPage.tsx),
  // not a workspace route — must mirror authConfig's authorized callback.
  const { pathname } = req.nextUrl;
  const isPublicRoute = pathname === "/" || pathname.startsWith("/login");
  const isWorkspaceRoute = !isPublicRoute;

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  // React's dev-mode Fast Refresh uses eval() for stack-trace reconstruction
  // ("React will never use eval() in production mode" — its own console
  // warning). Allowing it only outside production keeps the deployed CSP
  // strict while dev/test tooling (HMR) still works.
  const scriptSrc =
    process.env.NODE_ENV === "production"
      ? `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`
      : `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'unsafe-eval'`;
  const cspHeader = [
    "default-src 'self'",
    scriptSrc,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");

  if (isWorkspaceRoute && !isLoggedIn) {
    const response = NextResponse.redirect(new URL("/login", req.nextUrl.origin));
    response.headers.set("Content-Security-Policy", cspHeader);
    return response;
  }

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", cspHeader);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", cspHeader);
  return response;
});

export const config = {
  // robots.txt (and any future top-level metadata route like sitemap.xml)
  // must stay reachable without a session — a crawler never has one, and
  // gating it behind a login redirect defeats its purpose (found during
  // production-readiness testing: it was being redirected to /login).
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|robots.txt).*)"],
};
