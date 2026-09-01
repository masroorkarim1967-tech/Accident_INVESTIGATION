import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/health (technical-architecture.md §4.2, §10) — uptime check.
 * Queries the database with a trivial SELECT 1; returns 200 if reachable,
 * 503 otherwise. Useful for external uptime monitors even without Vercel
 * requiring one itself. No investigation data or internals in the
 * response body (security-spec.md §10 — generic to the client).
 */
export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok" }, { status: 200 });
  } catch {
    return NextResponse.json({ status: "unavailable" }, { status: 503 });
  }
}
