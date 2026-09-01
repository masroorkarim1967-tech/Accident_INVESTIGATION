import { describe, expect, it, vi, afterAll, beforeEach } from "vitest";
import { db } from "@/lib/db";
import { UserRole } from "@/prisma/generated/prisma/client";
import { PostgresBlobStorageProvider } from "@/lib/services/storage/PostgresBlobStorageProvider";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

// See tests/integration/witness.test.ts for why revalidatePath is mocked.
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe.skipIf(!process.env.DATABASE_URL)("Evidence Management (FR-021-024)", () => {
  afterAll(async () => {
    await db.investigation.deleteMany({ where: { title: { startsWith: "TEST-FIXTURE-" } } });
    await db.$disconnect();
  });

  beforeEach(async () => {
    const { auth } = await import("@/lib/auth");
    const investigator = await db.user.findUniqueOrThrow({ where: { email: "r.okafor@investigations.example" } });
    vi.mocked(auth).mockResolvedValue({ user: { id: String(investigator.id), role: UserRole.Investigator } } as never);
  });

  async function makeFixtureInvestigation(title: string) {
    const investigator = await db.user.findUniqueOrThrow({ where: { email: "r.okafor@investigations.example" } });
    return db.investigation.create({
      data: {
        referenceNumber: `INC-TEST-${Math.random().toString(36).slice(2, 10)}`,
        title,
        status: "Open",
        reporterName: "Test Reporter",
        createdByUserId: investigator.id,
        assignedInvestigatorUserId: investigator.id,
        occurrence: { create: { occurrenceDateUtc: new Date("2026-03-15") } },
      },
    });
  }

  it("adds an evidence item (positive)", async () => {
    const { saveEvidenceAction } = await import("@/lib/actions/evidence");
    const investigation = await makeFixtureInvestigation("TEST-FIXTURE-evidence-add");

    // See witness.test.ts's positive-add test for why every optional field
    // is set to "" explicitly, matching real browser form submission.
    const formData = new FormData();
    formData.set("evidenceType", "Documents");
    formData.set("description", "Maintenance log entry for the affected gear.");
    formData.set("source", "Maintenance Records Office");
    formData.set("collectedBy", "");
    formData.set("dateObtained", "");
    formData.set("relevance", "High");
    formData.set("reliabilityAssessment", "High");
    formData.set("reliabilityNotes", "");
    formData.set("investigatorNotes", "");
    formData.set("custodyNotes", "");

    const result = await saveEvidenceAction(investigation.id, null, { error: null }, formData);
    expect(result.error).toBeNull();

    const items = await db.evidence.findMany({ where: { investigationId: investigation.id } });
    expect(items).toHaveLength(1);
    expect(items[0].evidenceType).toBe("Documents");
  });

  it("rejects a future Date Obtained server-side (negative)", async () => {
    const { saveEvidenceAction } = await import("@/lib/actions/evidence");
    const investigation = await makeFixtureInvestigation("TEST-FIXTURE-evidence-future-date");
    const future = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

    const formData = new FormData();
    formData.set("evidenceType", "Documents");
    formData.set("description", "Should be rejected.");
    formData.set("source", "Test");
    formData.set("dateObtained", future);
    formData.set("relevance", "Low");
    formData.set("reliabilityAssessment", "Low");

    const result = await saveEvidenceAction(investigation.id, null, { error: null }, formData);
    expect(result.error).not.toBeNull();
  });

  it("toggleNoEvidenceAvailableAction rejects confirming 'none' while evidence is still logged (EC-10)", async () => {
    const { toggleNoEvidenceAvailableAction } = await import("@/lib/actions/evidence");
    const investigation = await makeFixtureInvestigation("TEST-FIXTURE-evidence-toggle-blocked");
    await db.evidence.create({
      data: {
        investigationId: investigation.id,
        evidenceType: "Other",
        description: "Still here.",
        source: "Test",
        relevance: "Low",
        reliabilityAssessment: "Low",
      },
    });

    const result = await toggleNoEvidenceAvailableAction(investigation.id, true);
    expect(result.error).not.toBeNull();
  });

  it("cascade-deletes Attachment rows when the parent Evidence item is removed (FR-022, TS-012-016)", async () => {
    const investigation = await makeFixtureInvestigation("TEST-FIXTURE-evidence-cascade");
    const investigator = await db.user.findUniqueOrThrow({ where: { email: "r.okafor@investigations.example" } });
    const evidence = await db.evidence.create({
      data: {
        investigationId: investigation.id,
        evidenceType: "Photographs",
        description: "Photos for cascade test.",
        source: "Test",
        relevance: "Medium",
        reliabilityAssessment: "Medium",
      },
    });

    const storage = new PostgresBlobStorageProvider();
    const bytes = Buffer.from("fake-image-bytes");
    const storagePath = await storage.save(bytes, "test.png", "image/png");
    const attachment = await db.attachment.create({
      data: {
        evidenceId: evidence.id,
        fileName: "test.png",
        mimeType: "image/png",
        fileSizeBytes: bytes.length,
        storagePath,
        fileBytes: bytes,
        uploadedByUserId: investigator.id,
      },
    });

    await db.evidence.delete({ where: { id: evidence.id } });
    expect(await db.attachment.findUnique({ where: { id: attachment.id } })).toBeNull();
  });

  it("PostgresBlobStorageProvider round-trips bytes byte-for-byte through retrieve()", async () => {
    const investigation = await makeFixtureInvestigation("TEST-FIXTURE-storage-roundtrip");
    const investigator = await db.user.findUniqueOrThrow({ where: { email: "r.okafor@investigations.example" } });
    const evidence = await db.evidence.create({
      data: {
        investigationId: investigation.id,
        evidenceType: "Documents",
        description: "Round-trip test.",
        source: "Test",
        relevance: "Low",
        reliabilityAssessment: "Low",
      },
    });

    const storage = new PostgresBlobStorageProvider();
    const originalBytes = Buffer.from("The quick brown fox jumps over the lazy dog. 0123456789.");
    const storagePath = await storage.save(originalBytes, "roundtrip.txt", "text/plain");
    await db.attachment.create({
      data: {
        evidenceId: evidence.id,
        fileName: "roundtrip.txt",
        mimeType: "text/plain",
        fileSizeBytes: originalBytes.length,
        storagePath,
        fileBytes: originalBytes,
        uploadedByUserId: investigator.id,
      },
    });

    const retrieved = await storage.retrieve(storagePath);
    expect(Buffer.compare(retrieved, originalBytes)).toBe(0);
  });

  it("PostgresBlobStorageProvider.retrieve() throws 'File unavailable' for an unknown handle", async () => {
    const storage = new PostgresBlobStorageProvider();
    await expect(storage.retrieve("00000000-0000-0000-0000-000000000000")).rejects.toThrow("File unavailable.");
  });
});
