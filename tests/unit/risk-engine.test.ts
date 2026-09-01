import { describe, expect, it } from "vitest";
import { calculateRiskScore, resolveInvestigationPriority, moreSevere } from "@/lib/services/riskEngine";

describe("calculateRiskScore (data-model.md §6.3, TS-027/TS-028 style)", () => {
  it("computes Likely(4) x Major(4) = 16 (TS-027)", () => {
    expect(calculateRiskScore("Likely", "Major")).toBe(16);
  });

  it("computes every (likelihood, severity) combination correctly", () => {
    const likelihoods = ["Rare", "Unlikely", "Possible", "Likely", "AlmostCertain"] as const;
    const severities = ["Negligible", "Minor", "Moderate", "Major", "Catastrophic"] as const;
    for (let l = 0; l < likelihoods.length; l++) {
      for (let s = 0; s < severities.length; s++) {
        const expected = (l + 1) * (s + 1);
        expect(calculateRiskScore(likelihoods[l], severities[s])).toBe(expected);
      }
    }
  });

  it("minimum score is 1 (Rare x Negligible)", () => {
    expect(calculateRiskScore("Rare", "Negligible")).toBe(1);
  });

  it("maximum score is 25 (AlmostCertain x Catastrophic)", () => {
    expect(calculateRiskScore("AlmostCertain", "Catastrophic")).toBe(25);
  });
});

describe("resolveInvestigationPriority (data-model.md §6.5 matrix)", () => {
  it("Negligible severity + Low band = Routine", () => {
    expect(resolveInvestigationPriority("Negligible", "Low", null)).toBe("Routine");
  });

  it("Major severity + Critical band = Immediate", () => {
    expect(resolveInvestigationPriority("Major", "Critical", null)).toBe("Immediate");
  });

  it("Catastrophic severity + High band = Immediate", () => {
    expect(resolveInvestigationPriority("Catastrophic", "High", null)).toBe("Immediate");
  });

  it("Moderate severity + Low band = Routine", () => {
    expect(resolveInvestigationPriority("Moderate", "Low", null)).toBe("Routine");
  });

  it("category floor: DangerousGoodsIncident raises a Routine result to Elevated", () => {
    expect(resolveInvestigationPriority("Negligible", "Low", "DangerousGoodsIncident")).toBe("Elevated");
  });

  it("category floor: SecurityRelatedOccurrence raises a Routine result to Elevated", () => {
    expect(resolveInvestigationPriority("Minor", "Low", "SecurityRelatedOccurrence")).toBe("Elevated");
  });

  it("category floor never lowers an already-higher priority", () => {
    expect(resolveInvestigationPriority("Catastrophic", "Critical", "DangerousGoodsIncident")).toBe("Immediate");
  });

  it("category floor does not apply to unrelated categories", () => {
    expect(resolveInvestigationPriority("Negligible", "Low", "BaggageIncident")).toBe("Routine");
  });
});

describe("moreSevere (data-model.md §3.3 severity computation rule)", () => {
  it("returns the more severe of the two ratings", () => {
    expect(moreSevere("Negligible", "Catastrophic")).toBe("Catastrophic");
    expect(moreSevere("Major", "Minor")).toBe("Major");
  });

  it("returns either value when equal", () => {
    expect(moreSevere("Moderate", "Moderate")).toBe("Moderate");
  });
});
