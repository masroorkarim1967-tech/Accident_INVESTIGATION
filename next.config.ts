import type { NextConfig } from "next";

/**
 * Security headers (security-spec.md §3, closing the Phase-15-deferred
 * item now that production prep is underway). No Google Fonts hedge in
 * the CSP — technical-architecture.md §3.3 already commits to self-hosted
 * fonts via next/font, so no font-CDN origin is permitted at all
 * (spec-review.md SR-019's resolution).
 *
 * Content-Security-Policy is intentionally NOT set here — it must be
 * per-request (nonce-based) so Next.js's own inline hydration/RSC-streaming
 * scripts stay permitted. A static CSP here blocked those scripts outright
 * (self.__next_r invariant, app never hydrated — found during Phase 5 live
 * browser verification). Generated in proxy.ts instead; see its comments.
 */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
