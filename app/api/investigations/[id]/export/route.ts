import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { composeReport, canViewReport } from "@/lib/services/reportComposer";

/**
 * FR-058 — Export Investigation Data as JSON. Same view-access scoping as
 * the report itself (technical-architecture.md §4.2's canonical route
 * path — `implementation-plan.md`'s Phase 13 file list names
 * `report/json/route.ts` instead, but that's a stale guess predating this
 * more specific architecture section).
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const investigationId = Number(id);
  if (!Number.isInteger(investigationId)) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "Investigation not found." } }, { status: 404 });
  }

  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Not authenticated." } }, { status: 401 });
  }

  const report = await composeReport(investigationId, currentUser);
  if (!report) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "Investigation not found." } }, { status: 404 });
  }
  if (!canViewReport(currentUser, report.investigation.status)) {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "This investigation's report is available to Viewer accounts only once closed." } },
      { status: 403 },
    );
  }

  const payload = {
    investigation: report.investigation,
    history: report.history,
    exportedAt: new Date().toISOString(),
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${report.investigation.referenceNumber}.json"`,
    },
  });
}
