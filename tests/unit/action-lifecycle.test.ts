import { describe, expect, it } from "vitest";
import {
  checkStatusTransition,
  checkCanMarkComplete,
  checkCanVerify,
  resolveStatusAfterOwnerChange,
  type ActionActorContext,
} from "@/lib/services/actionLifecycle";

function actor(overrides: Partial<ActionActorContext> = {}): ActionActorContext {
  return { role: "Investigator", isActionOwner: false, isInvestigationOwner: false, ...overrides };
}

describe("checkStatusTransition (data-model.md §6.9.1)", () => {
  it("Open -> InProgress: allowed for Administrator, Manager, or the action's owner", () => {
    expect(checkStatusTransition("Open", "InProgress", actor({ role: "Administrator" })).ok).toBe(true);
    expect(checkStatusTransition("Open", "InProgress", actor({ role: "InvestigationManager" })).ok).toBe(true);
    expect(checkStatusTransition("Open", "InProgress", actor({ isActionOwner: true })).ok).toBe(true);
  });

  it("Open -> InProgress: rejected for a non-owner Investigator", () => {
    const result = checkStatusTransition("Open", "InProgress", actor({ isActionOwner: false }));
    expect(result.ok).toBe(false);
  });

  it("Assigned -> InProgress and InProgress -> Assigned: owner or Admin/Manager only", () => {
    expect(checkStatusTransition("Assigned", "InProgress", actor({ isActionOwner: true })).ok).toBe(true);
    expect(checkStatusTransition("InProgress", "Assigned", actor({ isActionOwner: true })).ok).toBe(true);
    expect(checkStatusTransition("Assigned", "InProgress", actor()).ok).toBe(false);
  });

  it("Assigned -> Open (owner removed): owner or Admin/Manager only", () => {
    expect(checkStatusTransition("Assigned", "Open", actor({ isActionOwner: true })).ok).toBe(true);
    expect(checkStatusTransition("Assigned", "Open", actor()).ok).toBe(false);
  });

  it("-> Cancelled from Open/Assigned/InProgress: Admin/Manager or an Investigator owning/assigned the investigation — NOT the action's own owner alone", () => {
    for (const from of ["Open", "Assigned", "InProgress"] as const) {
      expect(checkStatusTransition(from, "Cancelled", actor({ isInvestigationOwner: true })).ok).toBe(true);
      expect(checkStatusTransition(from, "Cancelled", actor({ role: "Administrator" })).ok).toBe(true);
      // Being the action's owner alone (not the investigation's) is not sufficient for Cancel.
      expect(checkStatusTransition(from, "Cancelled", actor({ isActionOwner: true, isInvestigationOwner: false })).ok).toBe(false);
    }
  });

  it("Completed/Verified -> InProgress (reopen): Admin/Manager ONLY, never the owner", () => {
    expect(checkStatusTransition("Completed", "InProgress", actor({ role: "Administrator" })).ok).toBe(true);
    expect(checkStatusTransition("Verified", "InProgress", actor({ role: "InvestigationManager" })).ok).toBe(true);
    expect(checkStatusTransition("Completed", "InProgress", actor({ isActionOwner: true })).ok).toBe(false);
  });

  it("Completed/Verified -> Cancelled: Admin/Manager ONLY, not INVESTIGATOR even if investigation owner", () => {
    expect(checkStatusTransition("Completed", "Cancelled", actor({ role: "Administrator" })).ok).toBe(true);
    expect(checkStatusTransition("Completed", "Cancelled", actor({ isInvestigationOwner: true })).ok).toBe(false);
  });

  it("rejects every transition not in the spec's table", () => {
    expect(checkStatusTransition("Open", "Completed", actor({ role: "Administrator" })).ok).toBe(false);
    expect(checkStatusTransition("Completed", "Verified", actor({ role: "Administrator" })).ok).toBe(false);
    expect(checkStatusTransition("Cancelled", "Open", actor({ role: "Administrator" })).ok).toBe(false);
    expect(checkStatusTransition("Open", "Verified", actor({ role: "Administrator" })).ok).toBe(false);
  });
});

describe("resolveStatusAfterOwnerChange (data-model.md §6.9.1 automatic Open -> Assigned)", () => {
  it("Open becomes Assigned the instant an owner is set", () => {
    expect(resolveStatusAfterOwnerChange("Open", true)).toBe("Assigned");
  });

  it("Open stays Open when no owner is set", () => {
    expect(resolveStatusAfterOwnerChange("Open", false)).toBe("Open");
  });

  it("a non-Open status is never auto-transitioned by an owner change", () => {
    expect(resolveStatusAfterOwnerChange("InProgress", true)).toBe("InProgress");
    expect(resolveStatusAfterOwnerChange("Completed", true)).toBe("Completed");
  });
});

describe("checkCanMarkComplete (FR-045a)", () => {
  it("allows Administrator, Manager, or the action's owner from Open/Assigned/InProgress", () => {
    for (const from of ["Open", "Assigned", "InProgress"] as const) {
      expect(checkCanMarkComplete(from, { role: "Administrator", isActionOwner: false }).ok).toBe(true);
      expect(checkCanMarkComplete(from, { role: "Investigator", isActionOwner: true }).ok).toBe(true);
    }
  });

  it("rejects a non-owner Investigator", () => {
    expect(checkCanMarkComplete("InProgress", { role: "Investigator", isActionOwner: false }).ok).toBe(false);
  });

  it("rejects marking complete from Completed, Verified, or Cancelled", () => {
    for (const from of ["Completed", "Verified", "Cancelled"] as const) {
      expect(checkCanMarkComplete(from, { role: "Administrator", isActionOwner: false }).ok).toBe(false);
    }
  });
});

describe("checkCanVerify (FR-045b)", () => {
  it("allows Administrator, Manager, or Reviewer from Completed, when not the owner", () => {
    expect(checkCanVerify("Completed", { role: "Administrator", isActionOwner: false }).ok).toBe(true);
    expect(checkCanVerify("Completed", { role: "InvestigationManager", isActionOwner: false }).ok).toBe(true);
    expect(checkCanVerify("Completed", { role: "Reviewer", isActionOwner: false }).ok).toBe(true);
  });

  it("rejects the action's own owner regardless of role (even Administrator)", () => {
    expect(checkCanVerify("Completed", { role: "Administrator", isActionOwner: true }).ok).toBe(false);
    expect(checkCanVerify("Completed", { role: "Reviewer", isActionOwner: true }).ok).toBe(false);
    const result = checkCanVerify("Completed", { role: "Administrator", isActionOwner: true });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/verified by someone other than its owner/);
  });

  it("rejects an Investigator who is not the owner (verification is reserved to Admin/Manager/Reviewer)", () => {
    expect(checkCanVerify("Completed", { role: "Investigator", isActionOwner: false }).ok).toBe(false);
  });

  it("rejects verifying from any status other than Completed", () => {
    for (const from of ["Open", "Assigned", "InProgress", "Verified", "Cancelled"] as const) {
      expect(checkCanVerify(from, { role: "Administrator", isActionOwner: false }).ok).toBe(false);
    }
  });
});
