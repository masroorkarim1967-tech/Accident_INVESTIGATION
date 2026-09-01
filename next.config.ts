import type { NextConfig } from "next";

/**
 * Security headers (security-spec.md §3, closing the Phase-15-deferred
 * item now that production prep is underway). No Google Fonts hedge in
 * the CSP — technical-architecture.md §3.3 already commits to self-hosted
 * fonts via next/font, so no font-CDN origin is permitted at all
 * (spec-review.md SR-019's resolution).
 */
const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: "default-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self';",
  },
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
